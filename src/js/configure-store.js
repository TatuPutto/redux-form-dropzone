import { createStore, combineReducers, applyMiddleware } from 'redux';
import { reducer as formReducer } from 'redux-form';

// const reduxDevtools = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
const store = createStore(
  combineReducers({ form: formReducer }),
  window.__REDUX_DEVTOOLS_EXTENSION__()
);

export default store;
