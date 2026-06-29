import { supabase } from '@/lib/supabaseClient';

// Definimos la estructura de tus datos para quitar los errores 'any'
interface Insumo {
  id: string;
  nombre_insumo: string;
  categoria: string;
  cantidad: number;
}

export default async function DashboardPage() {
  const { data: insumos, error } = await supabase
    .from('entradas_acopio')
    .select('*');

  if (error) return <p>Error al cargar: {error.message}</p>;

  // Agrupamos por categoría
  const agrupado = (insumos as Insumo[] || []).reduce((acc: Record<string, Insumo[]>, curr: Insumo) => {
    const cat = curr.categoria || 'Sin Categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1>Inventario Actual</h1>
      {Object.keys(agrupado).map((cat) => (
        <section key={cat} style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#0070f3' }}>{cat}</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Producto</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {agrupado[cat].map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px' }}>{item.nombre_insumo}</td>
                  <td style={{ padding: '8px' }}>{item.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}