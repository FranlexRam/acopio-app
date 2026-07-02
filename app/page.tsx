"use client";

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LOGO_URL = "https://i.postimg.cc/VvJ6LBTr/LOGO-TRIGALENZ-A-RUNNERS-1.png";
const categoriasBase = [
  "Insumos Médicos", "Equipos de Protección (EPP)", 
  "Higiene Personal", "Alimentos y Nutrición", "Rescate y Contingencia"
];

export default function AcopioApp() {
  const [categoria, setCategoria] = useState("Insumos Médicos");
  const [producto, setProducto] = useState("");
  const [esOtro, setEsOtro] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [inventario, setInventario] = useState<any[]>([]);
  const [catalogoMaestro, setCatalogoMaestro] = useState<any[]>([]);
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nuevaCant, setNuevaCant] = useState("");

  // Cálculo del total en tiempo real
  const totalProductos = inventario.reduce((sum, item) => sum + Number(item.cantidad), 0);

  useEffect(() => { 
    fetchInventario(); 
    fetchCatalogo(); 
  }, []);

  const fetchInventario = async () => {
    const { data } = await supabase.from('entradas_acopio').select('*').order('id', { ascending: false });
    setInventario(data || []);
  };

  const fetchCatalogo = async () => {
    const { data } = await supabase.from('catalogo_maestro').select('*');
    setCatalogoMaestro(data || []);
  };

  const guardarInsumo = async () => {
    if (!producto || !cantidad) {
      toast.error("Completa todos los campos");
      return;
    }

    const cantidadInput = parseInt(cantidad);
    const { data: existentes } = await supabase
      .from('entradas_acopio')
      .select('id, cantidad')
      .eq('nombre', producto)
      .eq('categoria', categoria);

    if (existentes && existentes.length > 0) {
      const nuevaCantidad = Number(existentes[0].cantidad) + cantidadInput;
      await supabase.from('entradas_acopio').update({ cantidad: nuevaCantidad }).eq('id', existentes[0].id);
      toast.success(`Actualizado: ${nuevaCantidad} unidades`);
    } else {
      await supabase.from('entradas_acopio').insert([{ nombre: producto, categoria, cantidad: cantidadInput }]);
      if (!catalogoMaestro.find(p => p.nombre === producto)) {
        await supabase.from('catalogo_maestro').insert([{ nombre: producto, categoria }]);
        fetchCatalogo();
      }
      toast.success("Producto registrado");
    }
    setProducto(""); setCantidad(""); setEsOtro(false); fetchInventario();
  };

  const actualizarCantidad = async (id: number) => {
    await supabase.from('entradas_acopio').update({ cantidad: parseInt(nuevaCant) }).eq('id', id);
    setEditandoId(null);
    fetchInventario();
    toast.success("Cantidad actualizada");
  };

  const borrarInsumo = (id: number, nombre: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p>¿Borrar <b>{nombre}</b>?</p>
        <div className="flex gap-2">
          <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={async () => {
            await supabase.from('entradas_acopio').delete().eq('id', id);
            toast.dismiss(t.id);
            toast.success("Producto eliminado correctamente", {
              icon: '🗑️',
              style: {
                background: '#000',
                color: '#ef4444',
                border: '1px solid #ef4444',
              },
            });
            fetchInventario();
          }}>Confirmar</button>
          <button onClick={() => toast.dismiss(t.id)}>Cancelar</button>
        </div>
      </div>
    ));
  };

  const descargarPDF = async () => {
    const doc = new jsPDF();
    const toDataURL = (url: string) => fetch(url).then(response => response.blob()).then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    }));

    try {
        const imgData = await toDataURL(LOGO_URL);
        doc.addImage(imgData, 'PNG', 14, 10, 20, 20);
    } catch (e) { console.error("Error cargando logo en PDF"); }

    doc.setFontSize(22);
    doc.text("Insumos - Centro de Acopio", 40, 20);
    doc.setFontSize(12);
    doc.text("Reporte de Inventario", 40, 28);
    
    let startY = 40;
    const categorias = [...new Set(inventario.map(item => item.categoria))];
    
    categorias.forEach(cat => {
      doc.setFontSize(14);
      doc.text(cat, 14, startY);
      const filas = inventario.filter(i => i.categoria === cat).map(i => [i.nombre, i.cantidad]);
      autoTable(doc, { 
        startY: startY + 5, 
        head: [['Producto', 'Cantidad']], 
        body: filas,
        styles: { fontSize: 12, cellPadding: 5 } 
      });
      startY = (doc as any).lastAutoTable.finalY + 15;
    });
    doc.save("Reporte_Acopio.pdf");
  };

  const inventarioFiltrado = inventario.filter(i => {
    const coincideBusqueda = i.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = filtroCategoria === "Todos" || i.categoria === filtroCategoria;
    return coincideBusqueda && coincideCategoria;
  });

  return (
    <div className="min-h-screen w-full bg-black text-white p-4 md:p-8">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      
      <header className="max-w-5xl mx-auto mb-10 text-center flex flex-col items-center gap-4">
        <img src={LOGO_URL} alt="Logo Sakti" className="h-60 w-auto object-contain" />
        <h1 className="text-4xl font-light tracking-tight text-blue-400">Insumos - Centro de Acopio</h1>
        
        {/* Contador de productos total */}
        <div className="bg-gray-900 border border-gray-800 px-8 py-4 rounded-2xl mt-4">
          <p className="text-gray-400 text-sm uppercase tracking-widest">Total recolectado</p>
          <p className="text-5xl font-bold text-white mt-1">{totalProductos}</p>
        </div>
      </header>
      
      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 flex flex-col gap-4">
          <label className="text-sm font-semibold text-gray-400">Categoría</label>
          <select className="p-4 bg-black rounded-xl border border-gray-700" onChange={(e) => {setCategoria(e.target.value); setProducto("");}}>
            {categoriasBase.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          <label className="text-sm font-semibold text-gray-400">Producto</label>
          {!esOtro ? (
            <input list="productos-list" className="p-4 bg-black rounded-xl border border-gray-700 w-full" placeholder="Buscar..." value={producto} onChange={(e) => {
              if(e.target.value === "OTRO") setEsOtro(true);
              else setProducto(e.target.value);
            }} />
          ) : (
            <div className="flex gap-2">
              <input className="p-4 bg-black rounded-xl border border-gray-700 flex-1" placeholder="Nuevo nombre" onChange={(e) => setProducto(e.target.value)} />
              <button className="bg-gray-700 px-4 rounded-xl" onClick={() => {setEsOtro(false); setProducto("");}}>X</button>
            </div>
          )}
          <datalist id="productos-list">
            {catalogoMaestro.filter(p => p.categoria === categoria).map(p => <option key={p.nombre} value={p.nombre} />)}
            <option value="OTRO" />
          </datalist>

          <label className="text-sm font-semibold text-gray-400">Cantidad</label>
          <input type="number" className="p-4 bg-black rounded-xl border border-gray-700" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          
          <button className="bg-blue-600 hover:bg-blue-700 p-4 rounded-xl font-bold transition-all" onClick={guardarInsumo}>Registrar / Sumar</button>
          <button className="bg-gradient-to-r from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 p-4 rounded-xl font-bold transition-all shadow-lg border border-red-500" onClick={descargarPDF}>Descargar Inventario PDF</button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="p-4 bg-gray-900 rounded-xl border border-gray-700 w-full" placeholder="🔍 Buscar nombre..." onChange={(e) => setBusqueda(e.target.value)} />
            <select className="p-4 bg-gray-900 rounded-xl border border-gray-700" onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="Todos">Todas las categorías</option>
              {categoriasBase.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          
          {inventarioFiltrado.map(item => (
            <div key={item.id} className="flex justify-between items-center bg-gray-900 p-5 rounded-xl border border-gray-800">
              <div>
                <p className="font-bold text-lg">{item.nombre}</p>
                <p className="text-xs text-blue-400 uppercase tracking-widest">{item.categoria}</p>
              </div>
              <div className="flex items-center gap-4">
                {editandoId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input type="number" className="w-20 bg-black p-2 rounded border border-gray-600 text-center" defaultValue={item.cantidad} onChange={(e) => setNuevaCant(e.target.value)} />
                    <button className="bg-green-600 px-3 py-2 rounded-xl" onClick={() => actualizarCantidad(item.id)}>✔</button>
                  </div>
                ) : (
                  <span className="text-3xl font-light cursor-pointer hover:text-blue-400 transition-colors" onClick={() => {setEditandoId(item.id); setNuevaCant(item.cantidad)}} title="Clic para editar">
                    {item.cantidad}
                  </span>
                )}
                <button className="text-red-500 hover:text-red-400 text-sm" onClick={() => borrarInsumo(item.id, item.nombre)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}