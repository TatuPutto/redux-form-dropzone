import React, { PureComponent } from 'react'
import { array, func } from 'prop-types'
import File from './File'

class Files extends PureComponent {
  render() {
    return (
      <div>
        <ul className="dropzone-files">
          {this.props.files.map(file => (
            <File
              key={file.name}
              file={file}
              removeFile={this.props.removeFile}
            />
          ))}
        </ul>
      </div>
    )
  }
}

Files.propTypes = {
  files: array.isRequired,
  removeFile: func.isRequired
}

export default Files
