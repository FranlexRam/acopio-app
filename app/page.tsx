"use client";

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const catalogo = {
  "Insumos Médicos": [
    "Gasas", "Algodón", "Alcohol Isopropílico", "Jeringas", "Vendas elásticas", "Agua oxigenada", "Guantes de látex", "Termómetros",
    "Ibuprofeno (Niños/Adultos)", "Acetaminofén (Gotas/Tabletas)", "Amoxicilina", "Suero Oral", "Sales de rehidratación",
    "Kit de sutura", "Analgésicos fuertes", "Ungüento antibiótico", "Crema para quemaduras", "Jarabe para la tos (Niños)", "Suplemento vitamínico",
    "Férulas", "Torniquetes", "Colirio ocular", "Pastillas para purificar agua"
  ],
  "Equipos de Protección (EPP)": [
    "Tapabocas N95", "Caretas faciales", "Gafas de seguridad", "Botas de goma", "Delantales desechables", "Gorros quirúrgicos",
    "Cascos de protección", "Chalecos reflectantes", "Guantes de trabajo pesado", "Cinturones de herramientas", "Silbatos de emergencia"
  ],
  "Higiene Personal": [
    "Jabón de barra", "Champú", "Desodorante", "Pasta dental", "Cepillos de dientes", "Toallas sanitarias", "Papel higiénico", "Toallitas húmedas",
    "Pañales (Etapa 1-6)", "Crema anti-pañalitis", "Talco", "Desinfectante de manos", "Peines", "Cortaúñas", "Toallas de baño", "Ropa interior desechable"
  ],
  "Alimentos y Nutrición": [
    "Agua (250mL)", "Agua (500mL)", "Agua (1.5L)", "Agua (5L)", "Agua (Garrafón)",
    "Arroz blanco", "Harina de maíz", "Granos (Caraotas/Lentejas)", "Aceite vegetal", "Leche en polvo", "Azúcar", "Atún en lata", "Pasta corta",
    "Sardinas en lata", "Galletas de soda", "Barritas energéticas", "Compotas (Niños)", "Cereal infantil", "Mantequilla de maní", "Chocolate oscuro", "Café/Té"
  ],
  "Rescate y Contingencia": [
    "Linternas", "Pilas (AA/AAA/D)", "Cintas adhesivas (Duct tape)", "Bolsas negras (Grandes)", "Marcadores permanentes", "Papel bond", "Sillas plásticas",
    "Mantas térmicas", "Carpas/Tiendas de campaña", "Colchonetas", "Cuerda de rescate (50m)", "Radio a baterías", "Encendedores/Fósforos", "Herramientas multiuso (Navaja)",
    "Radio AM/FM", "Ponchos para lluvia", "Señalización luminosa"
  ]
};

export default function AcopioApp() {
  const [categoria, setCategoria] = useState("Insumos Médicos");
  const [producto, setProducto] = useState("");
  const [esOtro, setEsOtro] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [inventario, setInventario] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [notificacion, setNotificacion] = useState<string | null>(null);

  const mostrarNotificacion = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 3000);
  };

  useEffect(() => { fetchInventario(); }, []);

  const fetchInventario = async () => {
    const { data } = await supabase.from('entradas_acopio').select('*');
    setInventario(data || []);
  };

  const guardarInsumo = async () => {
    if (!producto || !cantidad) return;

    const cantidadNueva = Number(cantidad);

    const { data: existentes } = await supabase
      .from('entradas_acopio')
      .select('id, cantidad')
      .eq('nombre', producto)
      .eq('categoria', categoria);

    if (existentes && existentes.length > 0) {
      const nuevaCantidad = Number(existentes[0].cantidad) + cantidadNueva;
      const { error } = await supabase
        .from('entradas_acopio')
        .update({ cantidad: nuevaCantidad })
        .eq('id', existentes[0].id);
      
      if (!error) mostrarNotificacion(`✓ ${producto}: ${nuevaCantidad} en total.`);
    } else {
      const { error } = await supabase
        .from('entradas_acopio')
        .insert([{ nombre: producto, categoria: categoria, cantidad: cantidadNueva }]);
      
      if (!error) mostrarNotificacion(`+ ${producto} agregado.`);
    }

    setProducto(""); setCantidad(""); setEsOtro(false); fetchInventario();
  };

  const borrarInsumo = async (id: number, nombre: string) => {
    if (window.confirm(`¿Eliminar ${nombre}?`)) {
      await supabase.from('entradas_acopio').delete().eq('id', id);
      fetchInventario();
    }
  };

  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Inventario", 14, 20);
    
    let startY = 30;
    const categorias = [...new Set(inventario.map(item => item.categoria))];

    categorias.forEach(cat => {
      doc.setFontSize(14);
      doc.text(cat, 14, startY);
      const filas = inventario.filter(i => i.categoria === cat).map(i => [i.nombre, i.cantidad]);
      autoTable(doc, { startY: startY + 5, head: [['Producto', 'Cantidad']], body: filas });
      startY = (doc as any).lastAutoTable.finalY + 15;
    });
    doc.save("inventario.pdf");
  };

  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-6 bg-black min-h-screen text-white">
      {notificacion && <div className="fixed top-4 left-4 right-4 bg-blue-600 p-3 rounded-lg text-center font-bold z-50 shadow-xl">{notificacion}</div>}
      
      <h1 className="text-3xl font-bold text-center text-blue-400">Gestión de Inventario</h1>
      
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 flex flex-col gap-4">
        <label className="text-sm font-semibold text-gray-300">Categoría</label>
        <select className="p-3 bg-gray-800 rounded-lg" onChange={(e) => {setCategoria(e.target.value); setProducto("");}}>
          {Object.keys(catalogo).map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <label className="text-sm font-semibold text-gray-300">Producto</label>
        {!esOtro ? (
          <>
            <input list="productos-list" className="p-3 bg-gray-800 rounded-lg w-full" placeholder="Buscar..." value={producto} onChange={(e) => {
              if(e.target.value === "OTRO") setEsOtro(true);
              else setProducto(e.target.value);
            }} />
            <datalist id="productos-list">
              {catalogo[categoria as keyof typeof catalogo].map(p => <option key={p} value={p} />)}
              <option value="OTRO" />
            </datalist>
          </>
        ) : (
          <div className="flex gap-2">
            <input className="p-3 bg-gray-800 rounded-lg flex-1" placeholder="Nuevo nombre" onChange={(e) => setProducto(e.target.value)} />
            <button className="bg-gray-700 p-2 rounded" onClick={() => {setEsOtro(false); setProducto("");}}>X</button>
          </div>
        )}

        <label className="text-sm font-semibold text-gray-300">Cantidad</label>
        <input type="number" className="p-3 bg-gray-800 rounded-lg" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <button className="bg-blue-600 p-4 rounded-lg font-bold" onClick={guardarInsumo}>Registrar / Sumar</button>
      </div>

      <input className="p-3 bg-gray-800 rounded-lg w-full" placeholder="🔍 Buscar..." onChange={(e) => setBusqueda(e.target.value)} />
      
      <div className="flex flex-col gap-2">
        {inventario.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(item => (
          <div key={item.id} className="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
            <div>
              <p className="font-bold">{item.nombre}</p>
              <p className="text-xs text-blue-400">{item.categoria}</p>
            </div>
            <span className="text-2xl font-bold">{item.cantidad}</span>
            <button className="text-red-500 text-xs" onClick={() => borrarInsumo(item.id, item.nombre)}>Borrar</button>
          </div>
        ))}
      </div>

      <button className="bg-red-700 p-4 rounded-lg font-bold w-full" onClick={descargarPDF}>Descargar PDF</button>
    </div>
  );
}