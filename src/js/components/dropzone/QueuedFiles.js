import React, { PureComponent } from 'react'
import File from './File';

class QueuedFiles extends PureComponent {
  render() {
    return (
      <div>
        <ul className="dropzone-files">
          <File file={this.props.activeFile} />
          {this.props.pendingFiles.map((file, i) => (
            <File file={file} removeFile={this.props.removeFile} />
          ))}
        </ul>
      </div>
    )
  }
}

export default QueuedFiles
