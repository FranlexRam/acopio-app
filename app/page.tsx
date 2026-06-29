"use client";

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Catálogo de productos predefinidos
const catalogo = {
  "Insumos Médicos": ["Gasas", "Algodón", "Alcohol Isopropílico", "Jeringas", "Vendas elásticas", "Agua oxigenada", "Guantes de látex", "Termómetros"],
  "Equipos de Protección (EPP)": ["Tapabocas N95", "Caretas faciales", "Gafas de seguridad", "Botas de goma", "Delantales desechables", "Gorros quirúrgicos"],
  "Higiene Personal": ["Jabón de barra", "Champú", "Desodorante", "Pasta dental", "Cepillos de dientes", "Toallas sanitarias", "Papel higiénico", "Toallitas húmedas"],
  "Alimentos y Nutrición": ["Arroz blanco", "Harina de maíz", "Granos", "Aceite vegetal", "Leche en polvo", "Azúcar", "Atún en lata", "Pasta corta"],
  "Materiales Generales": ["Linternas", "Pilas", "Cintas adhesivas", "Bolsas negras", "Marcadores permanentes", "Papel bond", "Sillas plásticas"]
};

export default function AcopioApp() {
  const [categoria, setCategoria] = useState("Insumos Médicos");
  const [producto, setProducto] = useState("");
  const [esOtro, setEsOtro] = useState(false);
  const [cantidad, setCantidad] = useState("");
  
  // Estados para el Dashboard
  const [inventario, setInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");

  // Cargar inventario al iniciar
  useEffect(() => { fetchInventario(); }, []);

  const fetchInventario = async () => {
    const { data } = await supabase.from('entradas_acopio').select('*').order('categoria');
    if (data) setInventario(data);
  };

  const guardarInsumo = async () => {
    if (!producto || !cantidad) {
      alert("Por favor, selecciona un producto y la cantidad");
      return;
    }

    const cantidadNueva = parseInt(cantidad);

    const { data: existente } = await supabase
      .from('entradas_acopio')
      .select('id, cantidad')
      .eq('nombre', producto)
      .eq('categoria', categoria)
      .single();

    if (existente) {
      await supabase.from('entradas_acopio').update({ cantidad: existente.cantidad + cantidadNueva }).eq('id', existente.id);
    } else {
      await supabase.from('entradas_acopio').insert([{ nombre: producto, categoria, cantidad: cantidadNueva }]);
    }

    setProducto(""); setCantidad(""); setEsOtro(false);
    fetchInventario(); // Refrescar lista
  };

  const borrarInsumo = async (id: string) => {
    await supabase.from('entradas_acopio').delete().eq('id', id);
    fetchInventario();
  };

  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Inventario", 14, 15);
    const filas = inventario.map(i => [i.categoria, i.nombre, i.cantidad]);
    autoTable(doc, { head: [['Categoría', 'Producto', 'Cantidad']], body: filas });
    doc.save("reporte-inventario.pdf");
  };

  // Filtrado de búsqueda
  const inventarioFiltrado = inventario.filter(i => 
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    i.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center text-blue-400">Gestión de Inventario</h1>
      
      {/* FORMULARIO */}
      <div className="bg-gray-900 p-6 rounded-xl flex flex-col gap-4 border border-gray-700">
        <label className="text-sm font-semibold text-gray-300">Categoría</label>
        <select className="p-3 bg-gray-800 rounded-lg" onChange={(e) => {setCategoria(e.target.value); setProducto(""); setEsOtro(false);}}>
          {Object.keys(catalogo).map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <label className="text-sm font-semibold text-gray-300">Producto</label>
        {!esOtro ? (
          <select className="p-3 bg-gray-800 rounded-lg" value={producto} onChange={(e) => {
            if(e.target.value === "OTRO") setEsOtro(true);
            else setProducto(e.target.value);
          }}>
            <option value="">Selecciona un producto...</option>
            {catalogo[categoria as keyof typeof catalogo].map(p => <option key={p} value={p}>{p}</option>)}
            <option value="OTRO" className="text-blue-400 font-bold">+ Agregar otro producto</option>
          </select>
        ) : (
          <div className="flex gap-2">
            <input className="p-3 bg-gray-800 rounded-lg flex-1" placeholder="Nombre nuevo" onChange={(e) => setProducto(e.target.value)} />
            <button className="bg-gray-700 p-2 rounded" onClick={() => {setEsOtro(false); setProducto("");}}>X</button>
          </div>
        )}

        <label className="text-sm font-semibold text-gray-300">Cantidad</label>
        <input type="number" className="p-3 bg-gray-800 rounded-lg" placeholder="Cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <button className="bg-blue-600 p-4 rounded-lg font-bold" onClick={guardarInsumo}>Registrar Producto</button>
      </div>

      {/* BUSCADOR */}
      <input className="p-3 bg-gray-800 rounded-lg w-full border border-gray-700" placeholder="🔍 Buscar producto..." onChange={(e) => setBusqueda(e.target.value)} />
      
      {/* LISTA DE INVENTARIO */}
      <div className="flex flex-col gap-2">
        {inventarioFiltrado.map(item => (
          <div key={item.id} className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700">
            <div>
              <p className="font-bold">{item.nombre}</p>
              <p className="text-xs text-blue-400 uppercase">{item.categoria}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl font-bold">{item.cantidad}</span>
              <button className="text-red-500 text-sm" onClick={() => borrarInsumo(item.id)}>Borrar</button>
            </div>
          </div>
        ))}
      </div>

      <button className="bg-red-700 p-4 rounded-lg font-bold w-full" onClick={descargarPDF}>Descargar PDF</button>
    </div>
  );
}