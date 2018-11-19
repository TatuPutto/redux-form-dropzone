import React, { Fragment } from 'react'
import l10n from '../util/l10n'

const Errors = ({ dismiss, erroredFiles }) => (
  <div className="alert alert-danger mt-2">
    {erroredFiles.length === 1 ?
      <Fragment>
        <div className="font-weight-bold">
          {erroredFiles[0].action === 'REMOVE' ?
            <Fragment>
              {l10n(
                'error.failedToRemove',
                '"{0}" poistaminen epäonnistui.',
                [erroredFiles[0].name]
              )}
            </Fragment>
            :
            <Fragment>
              {l10n(
                'error.failedToUpload',
                '"{0}" lähettäminen epäonnistui.',
                [erroredFiles[0].name]
              )}
            </Fragment>
          }
          {l10n(
            'error.failedToUpload',
            '"{0}" lähettäminen epäonnistui.',
            [erroredFiles[0].name]
          )}
        </div>
        {erroredFiles[0].error}
      </Fragment>
      :
      <Fragment>
        {'Seuraavien tiedostojen lähettäminen ei onnistunut:'}
        <ul className="mt-2 mb-1">
          {erroredFiles.map(erroredFile => (
            <li key={erroredFile.name} className="mt-2">
              <span className="font-weight-bold">
                {erroredFile.name}
              </span>
              <br />
              {erroredFile.error}
            </li>
          ))}
          </ul>
      </Fragment>
    }
  </div>
)

export default Errors
