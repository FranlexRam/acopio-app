"use client";

import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  useEffect(() => { 
    fetchInventario(); 
    fetchCatalogo(); 
  }, []);

  const fetchInventario = async () => {
    const { data } = await supabase.from('entradas_acopio').select('*');
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
    
    // 1. Guardar/Sumar en Inventario
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
      
      // 2. Si es producto nuevo, guardarlo en el catálogo maestro si no existe
      if (!catalogoMaestro.find(p => p.nombre === producto)) {
        await supabase.from('catalogo_maestro').insert([{ nombre: producto, categoria }]);
        fetchCatalogo();
      }
      toast.success("Producto registrado");
    }
    
    setProducto(""); setCantidad(""); setEsOtro(false); fetchInventario();
  };

  const borrarInsumo = (id: number, nombre: string) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p>¿Borrar <b>{nombre}</b>?</p>
        <div className="flex gap-2">
          <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={async () => {
            await supabase.from('entradas_acopio').delete().eq('id', id);
            toast.dismiss(t.id);
            fetchInventario();
          }}>Confirmar</button>
          <button onClick={() => toast.dismiss(t.id)}>Cancelar</button>
        </div>
      </div>
    ));
  };

  const descargarPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Inventario", 14, 20);
    let startY = 30;
    const categorias = [...new Set(inventario.map(item => item.categoria))];
    categorias.forEach(cat => {
      doc.text(cat, 14, startY);
      const filas = inventario.filter(i => i.categoria === cat).map(i => [i.nombre, i.cantidad]);
      autoTable(doc, { startY: startY + 5, head: [['Producto', 'Cantidad']], body: filas });
      startY = (doc as any).lastAutoTable.finalY + 15;
    });
    doc.save("inventario.pdf");
  };

  return (
    <div className="p-4 max-w-md mx-auto min-h-screen bg-black text-white">
      <Toaster />
      <h1 className="text-3xl font-bold text-center text-blue-400 mb-6">SAKTI INVENTORY</h1>
      
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-700 flex flex-col gap-4">
        <label className="text-sm font-semibold text-gray-300">Categoría</label>
        <select className="p-3 bg-gray-800 rounded-lg" onChange={(e) => {setCategoria(e.target.value); setProducto("");}}>
          {categoriasBase.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>

        <label className="text-sm font-semibold text-gray-300">Producto</label>
        {!esOtro ? (
          <>
            <input list="productos-list" className="p-3 bg-gray-800 rounded-lg w-full" placeholder="Buscar..." value={producto} onChange={(e) => {
              if(e.target.value === "OTRO") setEsOtro(true);
              else setProducto(e.target.value);
            }} />
            <datalist id="productos-list">
              {catalogoMaestro.filter(p => p.categoria === categoria).map(p => <option key={p.nombre} value={p.nombre} />)}
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

      <input className="p-3 bg-gray-800 rounded-lg w-full mt-6" placeholder="🔍 Buscar..." onChange={(e) => setBusqueda(e.target.value)} />
      
      <div className="flex flex-col gap-2 mt-4">
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

      <button className="bg-red-700 p-4 rounded-lg font-bold w-full mt-6" onClick={descargarPDF}>Descargar PDF</button>
    </div>
  );
}