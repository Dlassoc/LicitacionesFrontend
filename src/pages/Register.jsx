import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { FaEye, FaEyeSlash, FaUser, FaEnvelope, FaLock, FaExclamationCircle } from "react-icons/fa";
import logo from "../assets/logo_emergente.png";
import SplashScreen from "../components/SplashScreen.jsx";
import "../styles/register.css";

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
  const [showPw, setShowPw] = useState(false);           // un solo ojo para ambos
  const [passwordStrength, setPasswordStrength] = useState(0); // 0–100

  // no permitir ver la página si ya está logueado
  if (ready && user) navigate("/", { replace: true });

  const confirmMismatch =
    form.confirmPassword.length > 0 && form.confirmPassword !== form.password;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "password") {
      // fuerza simplificada solo por longitud (para pruebas)
      setPasswordStrength(Math.min(value.length * 10, 100));
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
    if (error) return setMsg(error);

    try {
      setLoading(true);
      await register({
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        password: form.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setMsg(err?.message || "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  };

  const strengthClass =
    passwordStrength >= 70 ? "bg-green-500" :
    passwordStrength >= 40 ? "bg-yellow-500" : "bg-red-500";

  const strengthLabel =
    passwordStrength >= 70 ? "Segura" :
    passwordStrength >= 40 ? "Moderada" : "Débil";

  return (
    <>
      {loading && <SplashScreen text="Creando tu cuenta…" />}

      <div className="bg-custom">
        <form onSubmit={submit} className="form-container">
          {/* Logo */}
          <div className="mb-5">
            <img src={logo} alt="Logo de Emergente" className="w-48 h-auto mx-auto" />
          </div>

          <h2 className="text-title">Crear cuenta</h2>

          {/* Nombre */}
          <div className="field-block">
            <label className="label-center">Nombre completo</label>
            <div className="input-wrapper">
              <span className="input-icon-left"><FaUser /></span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                type="text"
                placeholder="EJ. Juan Pérez"
                className="input-field input-with-lefticon"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="field-block">
            <label className="label-center">Correo electrónico</label>
            <div className="input-wrapper">
              <span className="input-icon-left"><FaEnvelope /></span>
              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                placeholder="Ej. usuario@dominio.com"
                className="input-field input-with-lefticon"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field-block">
            <label className="label-center">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon-left"><FaLock /></span>
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type={showPw ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                className="input-field input-with-bothicons"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <span className="eye-icon" onClick={() => setShowPw((v) => !v)} aria-label="Mostrar/Ocultar contraseñas">
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <p className="hint-muted">La contraseña debe tener al menos 6 caracteres.</p>
          </div>

          {/* Confirm Password */}
          <div className="field-block">
            <label className="label-center">Confirmar contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon-left"><FaLock /></span>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                type={showPw ? "text" : "password"}
                placeholder="Confirma tu contraseña"
                className={`input-field input-with-bothicons ${confirmMismatch ? "input-error" : ""}`}
                required
                minLength={6}
                autoComplete="new-password"
                aria-invalid={confirmMismatch}
                aria-describedby={confirmMismatch ? "confirm-help" : undefined}
              />
              {confirmMismatch && (
                <span className="input-icon-right-error" aria-hidden="true">
                  <FaExclamationCircle />
                </span>
              )}
              <span className="eye-icon" onClick={() => setShowPw((v) => !v)} aria-label="Mostrar/Ocultar contraseñas">
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {confirmMismatch && (
              <p id="confirm-help" className="hint-error">Las contraseñas no coinciden.</p>
            )}
          </div>

          {/* Barra de seguridad */}
          <div className="mb-4">
            <div className="relative pt-1 mb-2">
              <label className="label-center">Seguridad de la contraseña</label>
              <div className="flex mb-1 items-center justify-between">
                <div className="password-strength-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={passwordStrength}>
                  <div className={`password-strength ${strengthClass}`} style={{ width: `${passwordStrength}%` }} />
                </div>
              </div>
              <p className={`password-strength-text ${
                passwordStrength >= 70 ? "text-green-500" :
                passwordStrength >= 40 ? "text-yellow-500" : "text-red-500"
              }`}>
                {strengthLabel}
              </p>
            </div>
          </div>

          {/* Mensaje general */}
          {msg && <p className="text-error">{msg}</p>}

          {/* Botón — NO modificar estilos */}
          <button type="submit" disabled={loading} className={`button-register ${loading ? "button-loading" : ""}`}>
            {loading ? "Registrando..." : "Registrarme"}
          </button>

          <p className="text-register">
            ¿Ya tienes cuenta? <Link to="/login" className="link-register">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </>
  );
}
