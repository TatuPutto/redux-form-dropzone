import React, { Fragment } from 'react';

const UploadErrors = ({ dismiss, failedUploads }) => (
  <div className="alert alert-danger mt-2">
  <span className="fas fa-exclamation-triangle" />
    {failedUploads.length === 1 ?
      <Fragment>
        {' Tiedoston lataaminen ei onnistunut:'}
        <div>
          {failedUploads[0].name}
        </div>
        <ul>
          <li>
            {failedUploads[0].error}
          </li>
        </ul>

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
                  {file.error}
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
