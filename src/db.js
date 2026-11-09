function abrirBaseDatos() {
    return new Promise((resolve, reject) => {
        const solicitud = indexedDB.open('entorno-limpio', 1)

        solicitud.onupgradeneeded = () => {
            const db = solicitud.result

            if (!db.objectStoreNames.contains('reportes')) {
                db.createObjectStore('reportes', { keyPath: 'id' })
            }
        }

        solicitud.onsuccess = () => {
            const db = solicitud.result
            db.onversionchange = () => db.close()
            resolve(db)
        }

        solicitud.onerror = () => reject(solicitud.error)
        solicitud.onblocked = () => {
            reject(new Error('Cierra las otras pestañas de la aplicación e intenta otra vez.'))
        }
    })
}

export async function guardarReporte(reporte) {
    const db = await abrirBaseDatos()

    try {
        await new Promise((resolve, reject) => {
            const transaccion = db.transaction('reportes', 'readwrite')

            transaccion.oncomplete = () => resolve()
            transaccion.onerror = () => reject(transaccion.error)
            transaccion.onabort = () => {
                reject(transaccion.error ?? new Error('Se canceló el guardado.'))
            }

            transaccion.objectStore('reportes').put(reporte)
        })
    } finally {
        db.close()
    }
}

export async function obtenerReportes() {
    const db = await abrirBaseDatos()

    try {
        return await new Promise((resolve, reject) => {
            const transaccion = db.transaction('reportes', 'readonly')
            const solicitud = transaccion.objectStore('reportes').getAll()

            transaccion.oncomplete = () => {
                resolve(
                    solicitud.result.sort(
                        (a, b) => b.creadoEn - a.creadoEn,
                    ),
                )
            }

            transaccion.onerror = () => reject(transaccion.error)
            transaccion.onabort = () => {
                reject(transaccion.error ?? new Error('Se canceló la consulta.'))
            }
        })
    } finally {
        db.close()
    }
}
export async function eliminarReporte(id) {
    const db = await abrirBaseDatos()

    try {
        await new Promise((resolve, reject) => {
            const transaccion = db.transaction('reportes', 'readwrite')
            transaccion.oncomplete = () => resolve()
            transaccion.onerror = () => reject(transaccion.error)
            transaccion.onabort = () => {
                reject(transaccion.error ?? new Error('Se canceló la eliminación.'))
            }
            transaccion.objectStore('reportes').delete(id)
        })
    } finally {
        db.close()
    }
}
