import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { FaEye, FaEyeSlash, FaEnvelope, FaLock } from "react-icons/fa";
import logo from "../assets/logo_emergente.png";
import SplashScreen from "../components/SplashScreen.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import "../styles/register.css"; // reutilizamos mismas clases visuales

export default function Login() {
  const { login, ready, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // ✅ NUEVO: Usar useEffect para redirigir, no durante render
  useEffect(() => {
    if (ready && user) {
      navigate("/app", { replace: true });
    }
  }, [ready, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validateForm = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "El correo no es válido.";
    if (!form.password) return "Ingresa tu contraseña.";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    const error = validateForm();
    if (error) return setMsg(error);

    try {
      setLoading(true);
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setMsg(err?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <SplashScreen text="Ingresando…" />}

      <div className="bg-custom">
        {/* Theme Toggle */}
        <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 50 }}>
          <ThemeToggle />
        </div>

        <form onSubmit={submit} className="form-container">
          {/* Logo */}
          <div className="mb-5">
            <img src={logo} alt="Logo de Emergente" className="w-48 h-auto mx-auto" />
          </div>

          <h2 className="text-title">Inicia sesión</h2>

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
                placeholder="Tu contraseña"
                className="input-field input-with-bothicons"
                required
                autoComplete="current-password"
              />
              <span className="eye-icon" onClick={() => setShowPw((v) => !v)} aria-label="Mostrar/Ocultar contraseña">
                {showPw ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>

          {/* Mensaje de error */}
          {msg && <p className="text-error">{msg}</p>}

          {/* Botón — usaremos el mismo estilo del register para consistencia */}
          <button type="submit" disabled={loading} className={`button-register ${loading ? "button-loading" : ""}`}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <p className="text-register">
            ¿No tienes cuenta? <Link to="/register" className="link-register">Crear cuenta</Link>
          </p>
        </form>
      </div>
    </>
  );
}
