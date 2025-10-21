import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import logo from '../assets/logo_emergente.png';  // Importar la imagen desde la carpeta 'assets'
import '../styles/login.css'; // Importar el archivo CSS

export default function Login() {
  const { login, ready, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  if (ready && user) {
    navigate(from, { replace: true });
  }

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setMsg(err.message || "No se pudo iniciar sesión");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={submit} className="form-container">
        
        {/* Logo */}
        <div className="text-center mb-6">
          <img src={logo} alt="Logo de Emergente" className="w-48 h-auto mx-auto" /> {/* Aumentar tamaño */}
        </div>

        <h2 className="text-title">Iniciar sesión</h2>

        <input
          className="input-field"
          placeholder="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="input-field"
          placeholder="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button className="button-login">
          Entrar
        </button>
        {msg && <p className="text-error">{msg}</p>}
        <p className="text-register">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="link-register">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}
