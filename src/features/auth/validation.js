import { isValidEmail } from "../../utils/commonHelpers.js";

export function normalizeAuthEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validateLoginForm({ email, password }) {
  if (!isValidEmail(email)) return "El correo no es válido.";
  if (!password) return "Ingresa tu contraseña.";
  return null;
}

export function validateRegisterForm({ name, email, password, confirmPassword }) {
  if (!String(name || "").trim()) return "El nombre es obligatorio.";
  if (!isValidEmail(email)) return "El correo no es válido.";
  if (String(password || "").length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (password !== confirmPassword) return "Las contraseñas no coinciden.";
  return null;
}
