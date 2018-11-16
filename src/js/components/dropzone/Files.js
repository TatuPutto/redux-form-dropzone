import React, { PureComponent } from 'react'
import File from './File';

class Files extends PureComponent {
  render() {
    return (
      <div>
        <ul className="dropzone-files">
          {this.props.files.map((file, i) => (
            <File
              key={file.name}
              file={file}
              removeFile={this.props.removeFile}
              retry={this.props.retry}
            />
          ))}
        </ul>
      </div>
    )
  }
}

export default Files
