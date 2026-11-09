import { useEffect, useRef, useState } from 'react'
import { guardarReporte, obtenerReportes, eliminarReporte } from './db'
import './App.css'
import Camara from './Camara'

export default function App() {
  const formularioRef = useRef(null)
  const descripcionRef = useRef(null)
  const solicitudUbicacionRef = useRef(0)
  const [editando, setEditando] = useState(null)
  const [reportes, setReportes] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [ubicacion, setUbicacion] = useState(null)
  const [localizando, setLocalizando] = useState(false)
  const [mensajeUbicacion, setMensajeUbicacion] = useState('')
  const [foto, setFoto] = useState(null)
  const [versionCamara, setVersionCamara] = useState(0)

  useEffect(() => {
    let activo = true

    obtenerReportes()
      .then((guardados) => {
        if (activo) setReportes(guardados)
      })
      .catch(() => {
        if (activo) {
          setMensaje(
            'No se pudieron leer los reportes. Recarga la página para intentar otra vez.',
          )
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  function limpiarFormulario() {
    solicitudUbicacionRef.current += 1
    setLocalizando(false)
    formularioRef.current?.reset()
    setEditando(null)
    setFoto(null)
    setUbicacion(null)
    setMensajeUbicacion('')
    setVersionCamara((version) => version + 1)
  }

  function editarReporte(reporte) {
    if (guardando || cargando) return
    if (!window.confirm('¿Editar este reporte? Se reemplazará cualquier cambio sin guardar del formulario.')) return

    limpiarFormulario()
    setEditando(reporte)
    const campos = formularioRef.current.elements
    campos.namedItem('tipo').value = reporte.tipo
    campos.namedItem('descripcion').value = reporte.descripcion
    campos.namedItem('direccion').value = reporte.direccion
    setFoto(reporte.foto ?? null)
    setUbicacion(reporte.ubicacion ?? null)
    setMensaje('Editando reporte. Los cambios se aplicarán al guardar.')
    descripcionRef.current?.focus()
  }

  function cancelarEdicion() {
    if (!window.confirm('¿Descartar los cambios de esta edición?')) return
    limpiarFormulario()
    setMensaje('Edición cancelada. El reporte original no cambió.')
  }

  async function borrarReporte(reporte) {
    if (cargando || guardando) return
    if (!window.confirm(`¿Eliminar el reporte «${reporte.tipo}» y su fotografía? Esta acción no se puede deshacer.`)) return

    setGuardando(true)
    setMensaje('')

    try {
      await eliminarReporte(reporte.id)
      setReportes((anteriores) =>
        anteriores.filter((anterior) => anterior.id !== reporte.id),
      )
      if (editando?.id === reporte.id) limpiarFormulario()
      setMensaje('Reporte eliminado de este navegador.')
    } catch {
      setMensaje('No se pudo eliminar el reporte. Intenta otra vez.')
    } finally {
      setGuardando(false)
    }
  }

  function obtenerUbicacion() {
    if (guardando || localizando) return
    const solicitud = ++solicitudUbicacionRef.current
    if (!navigator.geolocation) {
      setMensajeUbicacion(
        'Tu navegador no admite geolocalización. Escribe la dirección del problema.',
      )
      return
    }

    setLocalizando(true)
    setMensajeUbicacion('Obteniendo ubicación…')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (solicitud !== solicitudUbicacionRef.current) return
        setUbicacion({
          latitud: coords.latitude,
          longitud: coords.longitude,
          precision: coords.accuracy,
        })

        setMensajeUbicacion(
          'Ubicación obtenida. Comprueba que corresponda al lugar del problema.',
        )
        setLocalizando(false)
      },
      (error) => {
        if (solicitud !== solicitudUbicacionRef.current) return
        const mensajes = {
          1: 'No concediste permiso de ubicación. Puedes escribir la dirección.',
          2: 'No fue posible determinar tu ubicación. Intenta otra vez.',
          3: 'La búsqueda tardó demasiado. Intenta otra vez.',
        }

        setMensajeUbicacion(
          mensajes[error.code] ?? 'No se pudo obtener la ubicación.',
        )
        setLocalizando(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    )
  }

  async function crearReporte(evento) {
    evento.preventDefault()

    if (cargando || guardando || localizando) return

    const formulario = evento.currentTarget
    const datos = new FormData(formulario)
    const descripcion = datos.get('descripcion').trim()
    const direccion = datos.get('direccion').trim()

    if (!descripcion || !direccion) {
      setMensaje('Escribe la descripción y la dirección del problema.')
      return
    }

    const creadoEn = editando?.creadoEn ?? Date.now()

    const reporte = {
      ...editando,
      id: editando?.id ?? crypto.randomUUID(),
      tipo: datos.get('tipo'),
      descripcion,
      direccion,
      ubicacion,
      foto,
      creadoEn,
      fecha: editando?.fecha ?? new Date(creadoEn).toLocaleString('es-MX'),
      ...(editando ? { actualizadoEn: Date.now() } : {}),
      estado: 'Registrado localmente',
    }

    setGuardando(true)
    setMensaje('')

    try {
      await guardarReporte(reporte)

      setReportes((anteriores) =>
        editando
          ? anteriores.map((anterior) =>
            anterior.id === reporte.id ? reporte : anterior,
          )
          : [reporte, ...anteriores],
      )
      limpiarFormulario()
      setMensaje(editando
        ? 'Cambios guardados en este navegador.'
        : 'Reporte guardado en este navegador.')
    } catch {
      setMensaje(
        'No se pudo guardar el reporte. Tus datos siguen en el formulario; intenta otra vez.',
      )
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="app">
      <header className="cabecera">
        <a className="marca" href="#inicio">
          <span className="simbolo" aria-hidden="true">EL</span>
          Entorno Limpio
        </a>
        <a className="enlace" href="#reportes">Mis reportes</a>
      </header>

      <main id="inicio">
        <section className="presentacion">
          <span className="etiqueta">PARTICIPACIÓN CIUDADANA</span>
          <h1>Un entorno limpio empieza con tu reporte.</h1>
          <p>
            Registra problemas relacionados con la recolección de
            residuos y conserva los detalles en un solo lugar.
          </p>
          <div className="aviso">
            Proyecto académico. Los reportes no se envían al Ayuntamiento.
          </div>
        </section>

        <div className="columnas">
          <section className="panel" aria-labelledby="titulo-formulario">
            <span className="etiqueta">{editando ? 'EDITAR REPORTE' : 'NUEVO REPORTE'}</span>
            <h2 id="titulo-formulario">{editando ? 'Actualiza tu reporte' : '¿Qué está pasando?'}</h2>
            <p className="secundario">
              Cuéntanos qué ocurrió y dónde se encuentra el problema.
            </p>

            <form ref={formularioRef} onSubmit={crearReporte}>
              <fieldset disabled={cargando || guardando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <label htmlFor="tipo">Tipo de problema</label>
                <select id="tipo" name="tipo">
                  <option>No pasó el camión</option>
                  <option>Basura acumulada</option>
                  <option>Recolección incompleta</option>
                  <option>Otro problema de recolección</option>
                </select>

                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  ref={descripcionRef}
                  id="descripcion"
                  name="descripcion"
                  placeholder="Por ejemplo: el camión no pasó y quedaron bolsas en la esquina."
                  rows={4}
                  maxLength={1000}
                  required
                />

                <label htmlFor="direccion">Dirección o referencia</label>
                <input
                  id="direccion"
                  name="direccion"
                  placeholder="Calle, colonia y un punto de referencia"
                  maxLength={250}
                  required
                />

                <Camara
                  key={versionCamara}
                  foto={foto}
                  onFoto={setFoto}
                  bloqueada={cargando || guardando}
                />

                <div className="bloque-ubicacion">
                  <button
                    type="button"
                    disabled={localizando || guardando}
                    onClick={obtenerUbicacion}
                  >
                    {localizando ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
                  </button>

                  <p className="secundario">
                    Úsala solamente si estás en el lugar del problema.
                    La dirección escrita también se guardará.
                  </p>

                  <p className="mensaje" role="status">
                    {mensajeUbicacion}
                  </p>

                  {ubicacion && (
                    <div>
                      <p className="secundario">
                        Latitud: {ubicacion.latitud.toFixed(6)}
                        <br />
                        Longitud: {ubicacion.longitud.toFixed(6)}
                        <br />
                        Precisión aproximada: {Math.round(ubicacion.precision)} metros
                      </p>

                      <a
                        href={`https://www.openstreetmap.org/?mlat=${ubicacion.latitud}&mlon=${ubicacion.longitud}#map=17/${ubicacion.latitud}/${ubicacion.longitud}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Revisar ubicación en el mapa
                      </a>

                      <button
                        type="button"
                        className="quitar-ubicacion"
                        disabled={guardando}
                        onClick={() => {
                          setUbicacion(null)
                          setMensajeUbicacion('Ubicación eliminada del formulario.')
                        }}
                      >
                        Quitar ubicación
                      </button>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={cargando || guardando || localizando}>
                  {cargando
                    ? 'Cargando reportes…'
                    : guardando
                      ? 'Guardando…'
                      : editando ? 'Guardar cambios' : 'Crear reporte'}
                </button>
                {editando && (
                  <button
                    type="button"
                    className="boton-secundario"
                    style={{ marginTop: 12 }}
                    onClick={cancelarEdicion}
                  >
                    Cancelar edición
                  </button>
                )}
              </fieldset>
              <p className="mensaje" role="status">{mensaje}</p>
            </form>
          </section>

          <section
            className="panel"
            id="reportes"
            aria-labelledby="titulo-reportes"
          >
            <div className="titulo-lista">
              <div>
                <span className="etiqueta">TU ACTIVIDAD</span>
                <h2 id="titulo-reportes">Mis reportes</h2>
              </div>
              <span className="contador">{reportes.length}</span>
            </div>

            <p className="secundario">
              Tus reportes se guardan en este navegador y se conservan al recargar.
            </p>

            {reportes.length === 0 ? (
              <div className="vacio">
                <h3>Aún no hay reportes</h3>
                <p>
                  Completa el formulario para registrar tu primer reporte.
                </p>
              </div>
            ) : (
              <ul className="lista">
                {reportes.map((reporte) => (
                  <li key={reporte.id} className="reporte">
                    <span className="estado">{reporte.estado}</span>
                    <h3>{reporte.tipo}</h3>
                    <p className="descripcion">{reporte.descripcion}</p>
                    {reporte.foto && (
                      <img
                        className="foto-reporte"
                        src={reporte.foto}
                        alt={`Evidencia del reporte: ${reporte.tipo}`}
                        loading="lazy"
                      />
                    )}
                    <p><strong>Lugar:</strong> {reporte.direccion}</p>
                    {reporte.ubicacion && (
                      <p>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${reporte.ubicacion.latitud}&mlon=${reporte.ubicacion.longitud}#map=17/${reporte.ubicacion.latitud}/${reporte.ubicacion.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ver ubicación del reporte
                        </a>
                      </p>
                    )}
                    <time>{reporte.fecha}</time>
                    {reporte.actualizadoEn && (
                      <p className="secundario">
                        Última edición: {new Date(reporte.actualizadoEn).toLocaleString('es-MX')}
                      </p>
                    )}
                    <button
                      type="button"
                      style={{ display: 'block', marginTop: 16 }}
                      disabled={cargando || guardando}
                      onClick={() => editarReporte(reporte)}
                      aria-label={`Editar reporte: ${reporte.tipo}`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      style={{ display: 'block', marginTop: 12, background: '#a12b2b' }}
                      disabled={cargando || guardando}
                      onClick={() => borrarReporte(reporte)}
                      aria-label={`Eliminar reporte: ${reporte.tipo}`}
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer>
        Entorno Limpio · Versión 1.1 · Cuidemos el lugar donde vivimos.
      </footer>
    </div>
  )
}