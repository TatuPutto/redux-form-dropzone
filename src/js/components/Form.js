import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { reduxForm, FieldArray } from 'redux-form'
import initialFormValues from '../form-data'
import renderOrganizations from './Organizations'
import upload from '../upload'

const Form = ({ handleSubmit, initialValues, submitting }) => {
  return (
    <div className="container" style={{marginTop: '10rem'}}>
      <div className="row">
        <div className="col-md-6 offset-md-3">
          <form onSubmit={handleSubmit}>
            <FieldArray
              name="organizations"
              component={renderOrganizations}
            />
            {/*}{submitting ?
              <button>
                <span className="fas fa-spinner fa-spin fa-pulse" />
                Uploading...
              </button>
              :
              <button>Upload</button>
            }*/}
          </form>
        </div>
      </div>
    </div>
  );
}

const WrappedForm = reduxForm({
  form: 'testForm'
})(Form)

export default connect(state => ({
  initialValues: initialFormValues,
  onSubmit: upload
}))(WrappedForm)
