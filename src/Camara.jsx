import { useEffect, useRef, useState } from 'react'

export default function Camara({ foto, onFoto, bloqueada }) {
    const videoRef = useRef(null)
    const streamRef = useRef(null)
    const solicitudRef = useRef(0)
    const [abierta, setAbierta] = useState(false)
    const [solicitando, setSolicitando] = useState(false)
    const [lista, setLista] = useState(false)
    const [mensaje, setMensaje] = useState('')

    useEffect(() => {
        return () => {
            solicitudRef.current += 1
            streamRef.current?.getTracks().forEach((track) => track.stop())
        }
    }, [])

    function cerrarCamara() {
        solicitudRef.current += 1
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null

        if (videoRef.current) {
            videoRef.current.srcObject = null
        }

        setAbierta(false)
        setSolicitando(false)
        setLista(false)
    }

    async function abrirCamara() {
        if (!navigator.mediaDevices?.getUserMedia) {
            setMensaje('La cámara no está disponible en este navegador o conexión.')
            return
        }

        const solicitud = ++solicitudRef.current
        setSolicitando(true)
        setMensaje('')

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            })

            if (solicitud !== solicitudRef.current) {
                stream.getTracks().forEach((track) => track.stop())
                return
            }

            streamRef.current = stream
            setAbierta(true)
        } catch (error) {
            if (solicitud !== solicitudRef.current) return

            const mensajes = {
                NotAllowedError: 'No se concedió permiso para usar la cámara.',
                NotFoundError: 'No se encontró una cámara conectada.',
                NotReadableError: 'No se pudo abrir la cámara. Revisa si otra aplicación la está usando.',
            }

            setMensaje(mensajes[error.name] ?? 'No se pudo iniciar la cámara.')
        } finally {
            if (solicitud === solicitudRef.current) {
                setSolicitando(false)
            }
        }
    }

    useEffect(() => {
        if (!abierta || !videoRef.current) return

        const video = videoRef.current
        video.srcObject = streamRef.current

        video.play().catch(() => {
            setMensaje('No se pudo reproducir la cámara. Cancela e intenta otra vez.')
        })
    }, [abierta])

    function tomarFoto() {
        const video = videoRef.current

        if (!video?.videoWidth || !video?.videoHeight) {
            setMensaje('Espera a que aparezca la imagen de la cámara.')
            return
        }

        try {
            const escala = Math.min(
                1,
                1280 / Math.max(video.videoWidth, video.videoHeight),
            )

            const canvas = document.createElement('canvas')
            canvas.width = Math.round(video.videoWidth * escala)
            canvas.height = Math.round(video.videoHeight * escala)

            const contexto = canvas.getContext('2d')

            if (!contexto) throw new Error('No se pudo preparar la imagen.')

            contexto.drawImage(video, 0, 0, canvas.width, canvas.height)
            onFoto(canvas.toDataURL('image/jpeg', 0.8))
            cerrarCamara()
            setMensaje('Foto capturada. Se guardará cuando crees el reporte.')
        } catch {
            setMensaje('No se pudo capturar la foto. Intenta otra vez.')
        }
    }

    return (
        <div className="bloque-camara">
            <h3>Fotografía del problema</h3>
            <p className="secundario">
                Opcional. Agrega una imagen que ayude a describir lo ocurrido.
            </p>

            {!abierta && !solicitando && (
                <button
                    type="button"
                    onClick={abrirCamara}
                    disabled={bloqueada}
                >
                    {foto ? 'Volver a tomar foto' : 'Abrir cámara'}
                </button>
            )}

            {solicitando && (
                <p role="status">Esperando acceso a la cámara…</p>
            )}

            {abierta && (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        aria-label="Vista previa de la cámara"
                        onLoadedData={() => setLista(true)}
                    />

                    <button
                        type="button"
                        onClick={tomarFoto}
                        disabled={!lista || bloqueada}
                    >
                        Tomar foto
                    </button>
                </>
            )}

            {(abierta || solicitando) && (
                <button
                    type="button"
                    className="boton-secundario"
                    onClick={cerrarCamara}
                >
                    Cancelar cámara
                </button>
            )}

            {foto && !abierta && (
                <>
                    <img
                        className="foto-reporte"
                        src={foto}
                        alt="Fotografía que se adjuntará al reporte"
                    />

                    <button
                        type="button"
                        className="boton-secundario"
                        disabled={bloqueada}
                        onClick={() => {
                            onFoto(null)
                            setMensaje('Foto eliminada del formulario.')
                        }}
                    >
                        Quitar foto
                    </button>
                </>
            )}

            <p className="mensaje" role="status">{mensaje}</p>
        </div>
    )
}