const express = require('express')
const cors = require('cors')
const crypto = require('node:crypto')
const movies = require('./movies.json')
const { validateMovie, validatePartialMovie } = require('./schemas/movies')
const { appendFileSync } = require('node:fs')

const app = express()

app.use(cors({
    origin: (origin, callback) => {
        const ACCEPTED_ORIGINS = [
            'http://localhost:8080',
            'http://localhost:1234',
            'http://movies.com',
            'http://midu.dev'
        ]

        if (ACCEPTED_ORIGINS.includes(origin)) {
            return callback(null, true)
        }

        if (!origin) {
            return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'))
    }
}
))

app.use(express.json()) // middleware para poder recibir con req.body lo que enviemos en el body
app.disable('x-powered-by')

app.get('/', (req, res) => {
    res.json({ message: 'hola mundo' })
})



// Todos los recursos que sean movies se identifican con /movies
app.get('/movies', (req, res) => {
    const { genre } = req.query
    if (genre) {
        // filtrar por género sin sensibilidad a las mayúsculas
        const filteredMovies = movies.filter(
            movie => movie.genre.some(g => g.toLowerCase() === genre.toLocaleLowerCase())
        )
        return res.json(filteredMovies)
    }
    res.json(movies)
})

app.get('/movies/:id', (req, res) => {
    const { id } = req.params
    const movie = movies.find(movie => movie.id === id)

    if (movie) return res.json(movie)

    res.status(404).json({ message: 'Movie not found' })
})

app.post('/movies', (req, res) => {
    const result = validateMovie(req.body)

    if (result.error) {
        return res.status(400).json({ error: JSON.parse(result.error.message) })
    }

    const newMovie = {
        id: crypto.randomUUID(), // uuid v4
        ...result.data // no es lo mismo que req.body ya que esta no tiene las validaciones
    }

    movies.push(newMovie)

    res.status(201).json(newMovie) // Actualizar caché del cliente
})

app.delete('/movies/:id', (req, res) => {
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id === id)

    if (movieIndex === -1) {
        return res.status(404).json({ message: 'Movie not found' })
    }

    movies.splice(movieIndex, 1)

    return res.json({ message: 'Movie deleted' })
})

app.patch('/movies/:id', (req, res) => {
    const result = validatePartialMovie(req.body)

    // validar di existe error de validación
    if (result.error) {
        return res.status(400).json({
            error: JSON.parse(result.error.message)
        })
    }

    // validad que el id existe
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id === id)

    if (movieIndex === -1) {
        return res.status(404).json({ message: 'Movie not found' })
    }

    // traemos todas las variables del objeto que no se van a modificar y le actualizamos todas las que si se van a actualizar
    const updateMovie = {
        ...movies[movieIndex],
        ...result.data
    }

    // Reemplazamos el objeto actualizado
    movies[movieIndex] = updateMovie
    return res.json(updateMovie)

})


const PORT = process.env.PORT ?? 1234

app.listen(PORT, () => {
    console.log(`server listening on port http://localhost:${PORT}`)
})

export default app