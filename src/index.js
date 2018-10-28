import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import Form from './js/components/Form'
import store from './js/configure-store'
import './css/styles.css'

const App = () => (
  <Provider store={store}>
    <Form />
  </Provider>
);

ReactDOM.render(
  <App />,
  document.getElementById('app')
)
