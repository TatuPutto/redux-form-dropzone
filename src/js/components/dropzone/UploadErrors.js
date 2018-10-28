import React, { Fragment } from 'react';

const UploadErrors = ({ dismiss, failedUploads }) => (
  <div className="alert alert-danger mt-2">
  <span className="fas fa-exclamation-triangle" />
    {failedUploads.length === 1 ?
      <Fragment>
        {failedUploads[0].error}
      </Fragment>
      :
      <Fragment>
        {' Kaikkien tiedostojen lataaminen ei onnistunut:'}
        <ul className="mt-2 mb-1">
          {failedUploads.map((file, i) => (
            <li className="mt-2">
              <span className="font-weight-bold">
                {file.name}
              </span>
              <ul>
                <li>
                  {i === 0 ? 'Tiedosto on liian suuri.' : 'Tiedosto on väärän tyyppinen.'}
                </li>
              </ul>
            </li>
          ))}
          </ul>
      </Fragment>
    }
  </div>
);

/*<ul>
{failedUploads.map(file => (
  <li><span className="font-weight-bold">{file.name}</span></li>
))}
</ul>*/

export default UploadErrors;
