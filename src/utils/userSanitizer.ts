export function stripSensitiveUserFields(user: any) {
  const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...safeUser } = user ?? {};
  return safeUser;
}