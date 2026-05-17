import type { Request, Response } from "express";
import prisma from "../config/prisma.js";

type SearchFilters = {
  location?: string;
  type?: string;
  guests?: number;
  maxPrice?: number;
};

type AiRuntime = {
  searchChain: {
    invoke: (input: { query: string }) => Promise<unknown>;
  };
  descriptionChain: {
    invoke: (input: {
      title: string;
      location: string;
      type: string;
      guests: number;
      amenities: string;
      price: number;
    }) => Promise<string>;
  };
  chatChain: {
    invoke: (
      input: { input: string; listingsContext: string },
      options: { configurable: { sessionId: string } }
    ) => Promise<unknown>;
  };
};

let aiRuntimePromise: Promise<AiRuntime> | null = null;

function toPlainText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const maybeContent = (value as { content?: unknown }).content;
    if (typeof maybeContent === 'string') {
      return maybeContent;
    }
  }

  return String(value);
}

async function loadAiRuntime(): Promise<AiRuntime> {
  if (!aiRuntimePromise) {
    aiRuntimePromise = (async () => {
      const apiKey = process.env['GROQ_API_KEY'] || '';
      if (!apiKey) {
        throw new Error('GROQ_API_KEY is missing. Set it in your environment to enable AI features.');
      }

      const [groqModule, promptsModule, parsersModule, historyModule, runnableModule] = await Promise.all([
        import("@langchain/groq"),
        import("@langchain/core/prompts"),
        import("@langchain/core/output_parsers"),
        import("@langchain/core/chat_history"),
        import("@langchain/core/runnables"),
      ]);

      const { ChatGroq } = groqModule;
      const { ChatPromptTemplate } = promptsModule;
      const { JsonOutputParser, StringOutputParser } = parsersModule;
      const { InMemoryChatMessageHistory } = historyModule;
      const { RunnableWithMessageHistory } = runnableModule;

      const llm = new ChatGroq({
        apiKey,
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
      });

      const searchPrompt = ChatPromptTemplate.fromTemplate(`
You are a search assistant for an Airbnb-like platform.
Extract search filters from the user's natural language query.

User query: {query}

Return a JSON object with these optional fields:
- location: string (city or area mentioned)
- type: one of APARTMENT, HOUSE, VILLA, CABIN (if mentioned)
- guests: number (max guests needed)
- maxPrice: number (maximum price per night in USD)

Return ONLY valid JSON. No explanation. No markdown.
Example: {{"location": "Miami", "type": "VILLA", "guests": 4, "maxPrice": 300}}

If a field is not mentioned, omit it from the JSON.
`);

      const descriptionPrompt = ChatPromptTemplate.fromTemplate(`
You are a professional copywriter for an Airbnb-like platform.
Write an engaging, warm, and descriptive listing description.

Listing details:
- Title: {title}
- Location: {location}
- Type: {type}
- Max guests: {guests}
- Amenities: {amenities}
- Price per night: {price} USD

Write a 3-paragraph description:
1. Opening hook - what makes this place special
2. The space - describe the property and its features
3. The location - what guests can do nearby

Keep it between 150-200 words. Be specific and inviting. Do not use generic phrases like "perfect getaway".
`);

      const sessionHistories = new Map<string, InstanceType<typeof InMemoryChatMessageHistory>>();

      function getSessionHistory(sessionId: string): InstanceType<typeof InMemoryChatMessageHistory> {
        if (!sessionHistories.has(sessionId)) {
          sessionHistories.set(sessionId, new InMemoryChatMessageHistory());
        }
        return sessionHistories.get(sessionId)!;
      }

      const chatPrompt = ChatPromptTemplate.fromMessages([
        [
          "system",
          `You are a helpful Airbnb assistant. You help guests find listings, answer questions about properties, and assist with bookings.

Available listings context: {listingsContext}

Be friendly, concise, and helpful. If you don't know something, say so.
If asked about specific listings, refer to the context provided.`,
        ],
        ["placeholder", "{chat_history}"],
        ["human", "{input}"],
      ]);

      return {
        searchChain: searchPrompt.pipe(llm).pipe(new JsonOutputParser()),
        descriptionChain: descriptionPrompt.pipe(llm).pipe(new StringOutputParser()),
        chatChain: new RunnableWithMessageHistory({
          runnable: chatPrompt.pipe(llm),
          getMessageHistory: getSessionHistory,
          inputMessagesKey: "input",
          historyMessagesKey: "chat_history",
        }),
      };
    })();
  }

  return aiRuntimePromise;
}

export async function naturalLanguageSearch(req: Request, res: Response) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const { searchChain } = await loadAiRuntime();
    const filters = (await searchChain.invoke({ query })) as SearchFilters;

    const where: Record<string, unknown> = {};

    if (filters.location) {
      where["location"] = { contains: filters.location, mode: "insensitive" };
    }
    if (filters.type) {
      where["type"] = filters.type;
    }
    if (filters.guests) {
      where["guests"] = { gte: filters.guests };
    }
    if (filters.maxPrice) {
      where["pricePerNight"] = { lte: filters.maxPrice };
    }

    const listings = await prisma.listing.findMany({
      where,
      include: {
        host: { select: { name: true, avatar: true } },
      },
      take: 10,
    });

    res.json({
      query,
      extractedFilters: filters,
      results: listings,
      count: listings.length,
    });
  } catch (error) {
    console.error("Natural language search error:", error);
    res.status(500).json({ error: "Failed to process search query" });
  }
}

export async function generateListingDescription(req: Request, res: Response) {
  try {
    const { title, location, type, guests, amenities, price } = req.body;

    // Validate required fields
    if (!title || !location || !type || guests === undefined || !amenities || price === undefined) {
      return res.status(400).json({
        error: "Missing required fields: title, location, type, guests, amenities, and price are all required",
      });
    }

    // Validate types and ranges
    if (typeof title !== 'string' || title.trim().length < 10) {
      return res.status(400).json({ error: "Title must be a string with at least 10 characters" });
    }
    if (typeof location !== 'string' || location.trim().length < 3) {
      return res.status(400).json({ error: "Location must be a string with at least 3 characters" });
    }
    if (typeof type !== 'string' || !['APARTMENT', 'HOUSE', 'VILLA', 'CABIN'].includes(type)) {
      return res.status(400).json({ error: "Type must be one of: APARTMENT, HOUSE, VILLA, CABIN" });
    }
    if (typeof guests !== 'number' || guests < 1) {
      return res.status(400).json({ error: "Guests must be a number greater than 0" });
    }
    if (typeof price !== 'number' || price < 1) {
      return res.status(400).json({ error: "Price must be a number greater than 0" });
    }

    // Normalize amenities to array of strings
    let amenitiesArray: string[] = [];
    if (typeof amenities === 'string') {
      amenitiesArray = amenities.split(',').map(a => a.trim()).filter(a => a.length > 0);
    } else if (Array.isArray(amenities)) {
      amenitiesArray = amenities.map(a => String(a).trim()).filter(a => a.length > 0);
    }
    
    if (amenitiesArray.length === 0) {
      return res.status(400).json({ error: "At least one amenity is required" });
    }

    const { descriptionChain } = await loadAiRuntime();
    const description = await descriptionChain.invoke({
      title: title.trim(),
      location: location.trim(),
      type,
      guests: Math.min(guests, 100), // Cap to prevent unrealistic values
      amenities: amenitiesArray.join(", "),
      price: Math.min(price, 100000), // Cap to prevent unrealistic values
    });

    if (!description || typeof description !== 'string') {
      throw new Error('AI service returned invalid response');
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length === 0) {
      throw new Error('AI service generated empty description');
    }

    res.json({ description: trimmedDescription });
  } catch (error) {
    console.error("Description generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate description";
    res.status(500).json({ 
      error: "Failed to generate description",
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

export async function chat(req: Request, res: Response) {
  try {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({ error: "message and sessionId are required" });
    }

    const listings = await prisma.listing.findMany({
      take: 5,
      select: {
        title: true,
        location: true,
        pricePerNight: true,
        type: true,
        guest: true,
        amenities: true,
      },
    });

    const listingsContext = listings
      .map(
        (listing: (typeof listings)[number]) =>
          `- ${listing.title} in ${listing.location}: $${listing.pricePerNight}/night, ${listing.type}, up to ${listing.guest} guests, amenities: ${listing.amenities.join(", ")}`
      )
      .join("\n");

    const { chatChain } = await loadAiRuntime();
    const reply = await chatChain.invoke(
      { input: message, listingsContext },
      { configurable: { sessionId } }
    );

    res.json({ reply: toPlainText(reply), sessionId });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process chat message" });
  }
}