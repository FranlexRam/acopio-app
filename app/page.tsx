"use client"; // Le dice a Next.js que esto corre en el navegador del celular

import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode"; // Importación optimizada
import { supabase } from '../lib/supabaseClient'; // Nuestra conexión a la base de datos
import jsPDF from "jspdf";// La herramienta para crear el documento PDF
import autoTable from "jspdf-autotable";          // La herramienta para dibujar la tabla en el PDF

export default function AcopioApp() {
  // 1. MEMORIA: Aquí guardaremos el código cuando la cámara lo lea
  const [codigoEscaneado, setCodigoEscaneado] = useState("");
  // Estas memorias guardarán lo que el usuario escriba en el formulario
  const [nombre, setNombre] = useState(""); 
  const [categoria, setCategoria] = useState("Insumos Médicos"); // Ya viene con esta opción por defecto
  const [cantidad, setCantidad] = useState("");

  // 2. EFECTO: Escáner profesional
  useEffect(() => {
    // Si ya tenemos código, no hace falta encender la cámara
    if (codigoEscaneado) return;

    const html5QrCode = new Html5Qrcode("lector-camara");

    // Encendemos el escáner con la cámara trasera
    html5QrCode.start(
      { facingMode: "environment" }, 
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        setCodigoEscaneado(decodedText); // Guardamos el código
        html5QrCode.stop(); // Detenemos la cámara al detectar el código
      },
      (errorMessage) => {
        // Ignoramos errores de búsqueda continua
      }
    ).catch((err) => {
      console.error("No se pudo iniciar la cámara", err);
    });

    // Regla de limpieza: Si el usuario sale de la página, apagamos la cámara
    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch((err) => console.error("Error al detener", err));
      }
    };
  }, [codigoEscaneado]); // Se reinicia solo si limpiamos el código

  // 3. FUNCIÓN PARA GUARDAR EN LA BASE DE DATOS
  const guardarInsumo = async () => {
    // A. Verificar que no falten datos importantes
    if (!nombre || !cantidad) {
      alert("Por favor, escribe el nombre y la cantidad");
      return; // El 'return' vacío hace que la función se detenga aquí
    }

    // B. Armar el "paquete" con los datos
    const nuevoInsumo = {
      codigo_barras: codigoEscaneado, // Lo que leyó la cámara
      nombre: nombre,                 // Lo que el usuario escribió
      categoria: categoria,           // La categoría que eligió
      cantidad: parseInt(cantidad)    // Convertimos el texto de la cantidad a un número matemático
    };

    // C. Enviar el paquete a Supabase
    const { error } = await supabase
      .from('entradas_acopio')
      .insert([nuevoInsumo]);

    // D y E. Confirmar y limpiar
    if (error) {
      alert("Hubo un error al guardar: " + error.message);
    } else {
      alert("¡Insumo guardado correctamente!");
      
      // Vaciamos las memorias para el siguiente escaneo
      setCodigoEscaneado("");
      setNombre("");
      setCantidad("");
      // Nota: No vaciamos la 'categoria' por si el usuario sigue escaneando cosas del mismo tipo
    }
  };

  // 4. FUNCIÓN PARA GENERAR EL PDF MEJORADA
  const descargarPDF = async () => {
    // A. Traemos todos los registros de la base de datos
    const { data, error } = await supabase
      .from('entradas_acopio')
      .select('*')
      .order('categoria', { ascending: true }); // Ordenamos por categoría desde la base

    if (error || !data) {
      alert("Error al obtener los datos para el PDF");
      return;
    }

    // B. Creamos el documento PDF
    const doc = new jsPDF();
    doc.text("Reporte de Inventario por Categoría", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

    // C. Agrupamos los datos localmente
    const agrupado = data.reduce((acc: any, item: any) => {
      (acc[item.categoria] = acc[item.categoria] || []).push(item);
      return acc;
    }, {});

    let finalY = 30; // Posición inicial

    // D. Generar una tabla por cada categoría
    Object.keys(agrupado).forEach((categoria) => {
      doc.setFontSize(14);
      doc.text(categoria, 14, finalY);
      finalY += 5;

      const filas = agrupado[categoria].map((item: any) => [
        item.nombre,
        item.cantidad
      ]);

      autoTable(doc, {
        startY: finalY,
        head: [['Producto', 'Cantidad']],
        body: filas,
        theme: 'striped',
      });

      // Actualizamos la posición finalY para que la siguiente tabla no se monte
      finalY = (doc as any).lastAutoTable.finalY + 10;
    });

    // E. Guardar el archivo
    doc.save("inventario-acopio.pdf");
  };

  // 3. INTERFAZ: Lo que ve el usuario en la pantalla
  return (
    <div className="p-4 max-w-md mx-auto flex flex-col gap-6 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center text-blue-400">Acopio Digital</h1>
      
      {!codigoEscaneado ? (
        <div className="w-full flex flex-col items-center gap-4">
          <div id="lector-camara" className="w-full aspect-square bg-gray-900 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-xl"></div>
          <p className="text-gray-400 text-sm animate-pulse">Alinea el código de barras en el cuadro...</p>
        </div>
      ) : (
        <div className="bg-gray-900 p-6 rounded-xl flex flex-col gap-4 shadow-2xl border border-gray-700">
          <div className="bg-blue-900 border border-blue-400 p-3 rounded-lg text-center">
            <p className="text-xs text-blue-200 uppercase tracking-widest">Código Escaneado</p>
            <p className="text-xl font-mono font-bold text-white">{codigoEscaneado}</p>
          </div>

          <label className="text-sm font-semibold text-gray-300">Nombre del Insumo</label>
          <input 
            type="text" 
            className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-400 outline-none" 
            placeholder="Ej. Guantes de Nitrilo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)} 
          />

          <label className="text-sm font-semibold text-gray-300">Categoría</label>
          <select 
            className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 outline-none"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option>Insumos Médicos</option>
            <option>Equipos de Protección (EPP)</option>
            <option>Higiene Personal</option>
            <option>Alimentos y Nutrición</option>
            <option>Materiales Generales</option>
          </select>

          <label className="text-sm font-semibold text-gray-300">Cantidad Recibida</label>
          <input 
            type="number" 
            className="p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-400 outline-none" 
            placeholder="Ej. 50"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)} 
          />

          <button 
            className="mt-2 bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-lg font-bold text-lg shadow-lg transition-all"
            onClick={guardarInsumo}
          >
            Confirmar y Guardar
          </button>
          
          <button 
            className="bg-gray-700 hover:bg-gray-600 text-gray-200 p-3 rounded-lg font-medium transition-all"
            onClick={() => setCodigoEscaneado("")}
          >
            Cancelar escaneo
          </button>
        </div>
      )}

      <hr className="border-gray-800" />
      <button 
        className="bg-red-700 hover:bg-red-600 text-white p-4 rounded-lg font-bold w-full transition-all"
        onClick={descargarPDF}
      >
        Descargar Reporte PDF
      </button>
    </div>
  );
}