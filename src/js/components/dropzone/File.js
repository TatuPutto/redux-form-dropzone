import React, { PureComponent } from 'react';

class File extends PureComponent {
  renderPreview = () => {
    const { file, showPreview } = this.props
    let preview = null;

    if (/*!showPreview || */!file.type) return null

    if (file.type.includes('png') || file.type.includes('jpeg')) {
      preview = <img className="dropzone-file-preview" src={file.preview} />
    } else if (file.type.includes('pdf')) {
      preview = <span className="far fa-file-pdf dropzone-file-preview-placeholder" />
    } else if (file.type.includes('msword')) {
      preview = <span className="far fa-file-word dropzone-file-preview-placeholder" />
    } else {
      preview = <span className="far fa-file-alt dropzone-file-preview-placeholder" />
    }

    return (
      <div className="dropzone-file-preview-container">
        {preview}
      </div>
    )
  }

  renderUploadStatusIndicator = () => {
    const file = this.props.file
    let statusText;

    if (!file.status || file.status === 'UPLOADED') return null

    if (file.status === 'PENDING') {
      return (
        <div className="text-muted">
          <small>
            <span className="fas fa-clock" />
            {" "} Odottaa...
          </small>
        </div>
      )
    } else if (file.status === 'UPLOADING') {
      return (
        <div className="dropzone-file-upload-progress-container">
          <div
            className="dropzone-file-upload-progress text-primary"
            style={{ width: `${file.progress}%` }}
          />
        </div>
      )
    } else if (file.status === 'DECLINED' || file.status === 'RESENDABLE') {
      return (
        <div className="text-danger">
          <small>
            <span className="fas fa-exclamation-triangle" />
            {' ' + file.error}
          </small>
        </div>
      )
    }
  }

  render() {
    const file = this.props.file
    const showPreview = this.props.showPreview || true

    return (
      <li key={file.name} className="dropzone-file">

        {this.renderPreview()}

        <span className="dropzone-file-content truncate-text">
          <a href={file.location} target="_blank">
            {file.name}
            {file.location &&
              <span className="fas fa-external-link-alt ml-2" />
            }
          </a>
          {this.renderUploadStatusIndicator()}
        </span>

        {!file.status || file.status === 'UPLOADED' ?
          <button type="button" className="dropzone-file-action-btn dropzone-remove-file-btn" onClick={() => this.props.removeFile(file)}>
              <span className="far fa-trash-alt"></span>
          </button>
          : file.status && file.status === 'UPLOADING' ?
            <button type="button" className="dropzone-file-action-btn dropzone-cancel-upload-btn" onClick={() => this.props.removeFile(file)}>
                <span className="fas fa-times"></span>
            </button>
            : file.status && file.status === 'RETRIABLE' ?
              <button type="button" className="dropzone-file-action-btn dropzone-cancel-upload-btn" onClick={() => this.props.retry(file)}>
                  <span className="fas fa-sync"></span>
              </button>
              :
                ''
        }

      </li>
    );
  }

}

export default File;
