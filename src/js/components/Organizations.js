import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Field } from 'redux-form';
// import renderDropzone from './dropzone/RFDropzone';
import renderDropzone from './dropzone/RFDropzoneDeferred';

/*
uploadFn={attachmentService.uploadSecurityClearancePDF}
requestArgs={{ applicationId: applicationId, organizationId: organization.id }}

*/

const Organizations = (props) => {
  const { fields } = props;

  return (
    <Fragment>
      {fields.map(organization => (
        <div key={organization}>
          <h2>Liitetiedostot</h2>
          <Field
            name={`${organization}`}
            targetProp="attachments"
            maxFileSize={2097152}
            component={renderDropzone}
          />
        </div>
      ))}
    </Fragment>
  )
}

export default Organizations;
