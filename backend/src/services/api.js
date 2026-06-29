import axios from 'axios'

const http = axios.create({
  baseURL: 'http://localhost:3001/api'
})

export function useApi() {

  return {

    // ======================
    // AUTH
    // ======================
    auth: {

      login: (data) =>
        http.post('/auth/login', data)
          .then(r => r.data)

    },

    // ======================
    // MESAS
    // ======================
    mesas: {

      listar: () =>
        http.get('/mesas')
          .then(r => r.data)

    },

    // ======================
    // PRODUTOS
    // ======================
    produtos: {

      listar: () =>
        http.get('/produtos')
          .then(r => r.data),

      criar: (data) =>
        http.post('/produtos', data)
          .then(r => r.data)

    }

  }

}