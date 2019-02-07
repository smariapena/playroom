import React, { Component } from 'react';
// import parsePropTypes from 'parse-prop-types';
import flatMap from 'lodash/flatMap';
import debounce from 'lodash/debounce';
// import omit from 'lodash/omit';
import { Parser } from 'acorn-jsx';
import Resizable from 're-resizable';
import Preview from './Preview/Preview';
import styles from './Playroom.less';

import { store } from '../index';
import WindowPortal from './WindowPortal';
import UndockSvg from '../assets/icons/NewWindowSvg';
import { formatCode } from '../utils/formatting';

import * as monaco from 'monaco-editor';

const resizableConfig = {
  top: true,
  right: false,
  bottom: false,
  left: false,
  topRight: false,
  bottomRight: false,
  bottomLeft: false,
  topLeft: false
};

const insertEditor = () => {
  const editor = monaco.editor.create(
    document.getElementById('monacoContainer'),
    {
      value: '',
      language: 'javascript',
      automaticLayout: true,
      fontSize: 16,
      autoIndent: true
    }
  );
  editor.getModel().updateOptions({ tabSize: 2 });
  monaco.editor.setTheme('vs-dark');
  return editor;
};

export default class Playroom extends Component {
  constructor(props) {
    super(props);

    this.state = {
      codeReady: false,
      code: null,
      renderCode: null,
      height: 200,
      editorUndocked: false,
      key: 0
    };

    this.resizable = React.createRef();
  }

  componentDidMount() {
    Promise.all([this.props.getCode(), store.getItem('editorSize')]).then(
      ([code, height]) => {
        if (height) {
          this.setState({
            height
          });
          this.resizable.current.updateSize({ height });
        }
        this.initialiseCode(code);
        this.validateCode(code);
      }
    );

    this.editor = insertEditor();
    // this.editor.onDidChangeModelContent(() => {
    // this.updateCode(this.editor.getValue());
    // });

    window.addEventListener('keydown', this.handleKeyPress);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyPress);
  }

  setEditorUndocked = val => {
    this.setState({
      editorUndocked: val
    });
  };

  initialiseCode = code => {
    console.log('code: ', code);
    this.setState({
      codeReady: true,
      code,
      renderCode: code
    });
  };

  updateCode = code => {
    this.setState({ code });
    this.props.updateCode(code);
    this.validateCode(code);
  };

  validateCode = code => {
    try {
      // validate code is parsable
      new Parser({ plugins: { jsx: true } }, `<div>${code}</div>`).parse();

      this.setState({ renderCode: code });
    } catch (err) {
      const errorMessage = err && (err.message || '');

      const matches = errorMessage.match(/\(([0-9]+):/);

      const lineNumber =
        matches &&
        matches.length >= 2 &&
        matches[1] &&
        parseInt(matches[1], 10);

      if (!lineNumber) {
        return;
      }

      const marker = document.createElement('div');
      marker.classList.add(styles.marker);
      marker.setAttribute('title', err.message);
    }
  };

  handleKeyPress = e => {
    if (
      e.code === 'KeyS' &&
      (navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey)
    ) {
      e.preventDefault();

      const code = this.editor.getValue();
      const cursor = this.editor.getPosition();

      const { formattedCode, line, ch } = formatCode({
        code,
        cursor: {
          line: cursor.lineNumber,
          ch: cursor.column
        }
      });
      console.log('line, ch: ', line, ch);

      this.editor.setValue(formattedCode);
      this.editor.setPosition({ column: ch, lineNumber: line });
    }
  };

  updateHeight = (event, direction, ref, delta) => {
    console.log('delta: ', delta);
    console.log('ref.offsetHeight: ', ref.offsetHeight);
    this.setState(({ height: oldHeight }) => ({
      height: oldHeight + delta.height
    }));
    store.setItem('editorSize', ref.offsetHeight);
  };

  handleChange = debounce(this.updateCode, 200);

  handleResize = debounce(this.updateHeight, 200);

  handleUndockEditor = () => {
    this.setEditorUndocked(true);
  };

  handleRedockEditor = () => {
    this.setEditorUndocked(false);
  };

  render() {
    const {
      components,
      // staticTypes,
      themes,
      widths,
      frameComponent
    } = this.props;
    const {
      codeReady,
      // code,
      renderCode,
      height,
      editorUndocked
      // key
    } = this.state;

    const themeNames = Object.keys(themes);
    const frames = flatMap(widths, width =>
      themeNames.map(theme => {
        return { theme, width };
      })
    );

    if (this.editor && this.editor.setValue && renderCode) {
      this.editor.setValue(renderCode);
    }
    // console.log('editor.setValue: ', editor.setValue);

    // const componentNames = Object.keys(components).sort();
    // const tags = Object.assign(
    //   {},
    //   ...componentNames.map(componentName => {
    //     const staticTypesForComponent = staticTypes[componentName];
    //     if (
    //       staticTypesForComponent &&
    //       Object.keys(staticTypesForComponent).length > 0
    //     ) {
    //       return {
    //         [componentName]: {
    //           attrs: staticTypesForComponent
    //         }
    //       };
    //     }

    //     const parsedPropTypes = parsePropTypes(components[componentName]);
    //     const filteredPropTypes = omit(
    //       parsedPropTypes,
    //       'children',
    //       'className'
    //     );
    //     const propNames = Object.keys(filteredPropTypes);

    //     return {
    //       [componentName]: {
    //         attrs: Object.assign(
    //           {},
    //           ...propNames.map(propName => {
    //             const propType = filteredPropTypes[propName].type;

    //             return {
    //               [propName]:
    //                 propType.name === 'oneOf'
    //                   ? propType.value.filter(x => typeof x === 'string')
    //                   : null
    //             };
    //           })
    //         )
    //       }
    //     };
    //   })
    // );

    // const codeMirrorEl = (
    //   <ReactCodeMirror
    //     key={key}
    //     codeMirrorInstance={codeMirror}
    //     ref={this.storeCodeMirrorRef}
    //     value={code}
    //     onChange={this.handleChange}
    //     options={{
    //       mode: 'jsx',
    //       autoCloseTags: true,
    //       autoCloseBrackets: true,
    //       theme: 'neo',
    //       gutters: [styles.gutter],
    //       hintOptions: { schemaInfo: tags },
    //       extraKeys: {
    //         Tab: cm => {
    //           if (cm.somethingSelected()) {
    //             cm.indentSelection('add');
    //           } else {
    //             const indent = cm.getOption('indentUnit');
    //             const spaces = Array(indent + 1).join(' ');
    //             cm.replaceSelection(spaces);
    //           }
    //         },
    //         "'<'": completeAfter,
    //         "'/'": completeIfAfterLt,
    //         "' '": completeIfInTag,
    //         "'='": completeIfInTag
    //       }
    //     }}
    //   />
    // );

    if (editorUndocked && codeReady) {
      return (
        <div>
          <div className={styles.previewContainer}>
            <Preview
              code={renderCode}
              components={components}
              themes={themes}
              frames={frames}
              frameComponent={frameComponent}
            />
          </div>
          <WindowPortal
            height={window.outerHeight}
            width={window.outerWidth}
            onClose={this.handleRedockEditor}
            monacoModel={this.editor.getModel()}
          >
            <div
              className={styles.undockedEditorContainer}
              id="poppedMonacoContainer"
            />
          </WindowPortal>
        </div>
      );
    }

    // if (!codeReady) {
    //   return null;
    // }
    return (
      <div className={styles.root}>
        <div className={styles.previewContainer} style={{ bottom: height }}>
          <Preview
            code={renderCode}
            components={components}
            themes={themes}
            frames={frames}
            frameComponent={frameComponent}
          />
        </div>
        <Resizable
          ref={this.resizable}
          className={styles.editorContainer}
          defaultSize={{
            height: `${height}`, // issue in ff & safari when not a string
            width: '100vw'
          }}
          style={{
            position: 'fixed'
          }}
          onResize={this.handleResize}
          enable={resizableConfig}
        >
          <div className={styles.toolbar}>
            <UndockSvg
              title="Undock editor"
              className={styles.toolbarIcon}
              onClick={this.handleUndockEditor}
            />
          </div>
          <div
            id="monacoContainer"
            className={styles.monacoEditor}
            style={{ height }}
          />
        </Resizable>
      </div>
    );
  }
}
