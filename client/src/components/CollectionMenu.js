'use strict'

import React from 'react'
import 'styles/Message.scss'

class CollectionMenu extends React.Component {
  constructor(props) {
    super(props)
    this.state = {

    }
  }

  render () {
    return (
      <div className="CollectionMenu" key="CollectionMenu">
        <input name="CollectionName"
               placeholder="default"
               type="text"
        />
      </div>
    )
  }
}

export default CollectionMenu
