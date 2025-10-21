import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { FaEye, FaEyeSlash } from "react-icons/fa";  // Para los iconos de ojo
import logo from '../assets/logo_emergente.png';  // Importar la imagen desde la carpeta 'assets'
import '../styles/register.css'; // Importar el archivo CSS

export default function Register() {
  const { register, ready, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Si ya está logueado, redirigir
  if (ready && user) {
    navigate("/", { replace: true });
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));

    if (name === "password") {
      setPasswordStrength(value.length);
    }
  };

  const validateForm = () => {
    if (!form.name.trim()) return "El nombre es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El correo no es válido.";
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (form.password !== form.confirmPassword) return "Las contraseñas no coinciden.";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const error = validateForm();
    if (error) {
      setMsg(error);
      return;
    }

    try {
      setLoading(true);
      await register({
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        password: form.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setMsg(err.message || "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      
      <form
        onSubmit={submit}
        className="form-container"
      >
        {/* Logo */}
        <div className="text-center mb-6">
          <img src={logo} alt="Logo de Emergente" className="w-48 h-auto mx-auto" /> {/* Aumentar tamaño */}
        </div>

        <h2 className="text-2xl font-semibold text-center mb-6 text-[#27C5CE]">Crear cuenta</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            type="text"
            placeholder="EJ. Juan Pérez"
            className="input-field"
            required
            minLength={2}
            autoComplete="name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            placeholder="Ej. usuario@dominio.com"
            className="input-field"
            required
            autoComplete="email"
          />
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
          <div className="relative">
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              className="input-field"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <span
            className="absolute right-3 top-3 cursor-pointer text-[#27C5CE]" // Aplicando color azul principal
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 6 caracteres.</p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
          <div className="relative">
            <input
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirma tu contraseña"
              className="input-field"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <span
            className="absolute right-3 top-3 cursor-pointer text-[#27C5CE]" // Aplicando color azul principal
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
        </div>

        <div className="mb-4">
          <div className="relative pt-1 mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Seguridad de la contraseña</label>
            <div className="flex mb-2 items-center justify-between">
              <div className="password-strength-bar">
                <div
                  className={`password-strength ${passwordStrength > 8 ? "bg-green-500" : passwordStrength > 5 ? "bg-yellow-500" : "bg-red-500"}`}
                  style={{ width: `${passwordStrength * 10}%` }}
                ></div>
              </div>
            </div>
            <p className={`password-strength-text ${passwordStrength > 8 ? "text-green-500" : passwordStrength > 5 ? "text-yellow-500" : "text-red-500"}`}>
              {passwordStrength > 8 ? "Segura" : passwordStrength > 5 ? "Moderada" : "Débil"}
            </p>
          </div>
        </div>

        {msg && <p className="text-error">{msg}</p>} {/* Usando la clase de CSS importada */}

        <button
          type="submit"
          disabled={loading}
          className={`button-register ${loading ? "button-loading" : ""}`} // Usando la clase de CSS importada
        >
          {loading ? "Registrando..." : "Registrarme"}
        </button>

        <p className="text-register">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="link-register">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
