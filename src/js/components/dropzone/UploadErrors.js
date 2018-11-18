import React, { Fragment } from 'react'
import l10n from '../../util/l10n'

const UploadErrors = ({ dismiss, failedUploads }) => (
  <div className="alert alert-danger mt-2">
    {failedUploads.length === 1 ?
      <Fragment>
        <div className="font-weight-bold">
          {l10n(
            'error.failedToUpload',
            '"{0}" lähettäminen epäonnistui.',
            [failedUploads[0].name]
          )}
        </div>
        {failedUploads[0].error}
      </Fragment>
      :
      <Fragment>
        {'Seuraavien tiedostojen lähettäminen ei onnistunut:'}
        <ul className="mt-2 mb-1">
          {failedUploads.map(file => (
            <li key={file.name} className="mt-2">
              <span className="font-weight-bold">
                {file.name}
              </span>
              <br />
              {file.error}
            </li>
          ))}
          </ul>
      </Fragment>
    }
  </div>
)

export default UploadErrors
