import './css/compose.css';
import actions, {db, getTime} from '../actions';

import GridObject from '../utils/Grid';
import React, {Component} from 'react';
import Editor from '../components/Editor';
import Create from '../components/Create';
import RelativeTime from '../components/RelativeTime';
import EditableSpan from '../components/EditableSpan';
import {toArr, lazy} from '../jsUtils';
import {getUser} from '../store/user';

export default class Compose extends Component {
  constructor() {
    super();
    this.state = {
      composition: undefined,
      myCompositions: [],
    };
    this.cid = undefined;
    this.user = getUser();
    this.user.onAuth(() => {
      this.me = this.user.id;
      this.myCompositionsRef = db.ref('myCompositions/' + this.me);
      this.myCompositionsRef.on('value', (_myCompositions) => {
        let myCompositions = _myCompositions.val() || [];
        myCompositions = myCompositions.reverse();
        this.setState({myCompositions});
      });
    });
    this.color = 'rgb(118, 226, 118)';
  }

  createComposition({dims, pattern}) {
    actions.createComposition(dims, pattern, (cid) => {
      this.myCompositionsRef.transaction((lst) => [
        ...(lst || []),
        {
          cid: cid,
          title: 'Untitled',
          dims: {
            rows: dims.r,
            cols: dims.c,
          },
        },
      ]);
      this.selectComposition(cid);
    });
  }

  transaction(fn, cbk) {
    this.compositionRef.transaction(fn, cbk);
    this.composition = fn(this.composition);
    this.setState({composition: this.composition});
  }

  cellTransaction(r, c, fn) {
    this.compositionRef.child(`grid/${r}/${c}`).transaction(fn);
    this.composition.grid[r][c] = fn(this.composition.grid[r][c]);
    this.setState({composition: this.composition});
  }

  updateGrid(r, c, value) {
    this.cellTransaction(r, c, (cell) => ({
      ...cell,
      value: value,
    }));
  }

  clueTransaction(ori, idx, fn) {
    this.compositionRef.child(`clues/${ori}/${idx}`).transaction(fn);
    this.composition.clues[ori][idx] = fn(this.composition.clues[ori][idx]);
    this.setState({composition: this.composition});
  }

  updateClues(ori, idx, value) {
    this.clueTransaction(ori, idx, (clue) => value);
  }

  flipColor(r, c) {
    this.composition.grid[r][c].black = !this.composition.grid[r][c].black;
    this.grid.assignNumbers();
    this.composition.clues = this.grid.alignClues(this.composition.clues);
    this.compositionRef.set(this.composition);
    this.setState({composition: this.composition});
  }

  getCellSize() {
    return (30 * 15) / this.composition.grid[0].length;
  }

  updateTitle(title) {
    this.compositionRef.transaction((composition) => ({
      ...composition,
      info: {
        ...composition.info,
        title,
      },
    }));
    console.log(this.cid);
    this.myCompositionsRef.transaction((lst) => {
      lst.forEach((entry) => {
        console.log(entry);
        if (entry.cid === this.cid) {
          entry.title = title;
        }
      });
      return lst;
    });
  }

  updateAuthor(author) {
    this.transaction((composition) => ({
      ...composition,
      info: {
        ...composition.info,
        author: author,
      },
    }));
  }

  // convert from composition to puzzle
  getPuzzle() {
    const textGrid = this.grid.toTextGrid();
    return {
      info: this.composition.info,
      grid: textGrid,
      clues: this.composition.clues,
      private: !this.composition.published || this.composition.published.private,
    };
  }

  publish() {
    const puzzle = this.getPuzzle();
    actions.createPuzzle(puzzle, (pid) => {
      const date = getTime();
      const published = {pid, date, private: true};
      this.compositionRef.child(`published`).set(published);
      this.composition.published = published;
      this.setState({composition: this.composition});
    });
  }

  republish() {
    const {pid} = this.composition.published;
    const puzzle = this.getPuzzle();
    actions.updatePuzzle(pid, puzzle);
    const date = getTime();
    this.transaction((composition) => ({
      ...composition,
      published: {
        ...composition.published,
        date,
      },
    }));
  }

  makePublic() {
    this.transaction((composition) => ({
      ...composition,
      published: {
        ...composition.published,
        private: false,
      },
    }));
    actions.makePublic(this.composition.published.pid);
  }

  makePrivate() {
    this.transaction((composition) => ({
      ...composition,
      published: {
        ...composition.published,
        private: true,
      },
    }));
    actions.makePrivate(this.composition.published.pid);
  }

  exportToPuz() {
    // TODO
  }

  renderMain() {
    if (!this.composition) {
      return (
        <div className="compose--main">
          <div className="compose--main--select-a-puzzle">Select a puzzle from the left sidebar</div>
        </div>
      );
    }
    return (
      <div className="compose--main">
        <div className="compose--main--info">
          <div className="compose--main--info--title">
            <EditableSpan value={this.composition.info.title} onChange={this.updateTitle.bind(this)} />
          </div>
        </div>
        <div className="compose--main--info--subtitle">
          {this.composition.info.type + ' | ' + 'By '}
          <EditableSpan value={this.composition.info.author} onChange={this.updateAuthor.bind(this)} />
        </div>
        <div className="compose--main--editor">
          <Editor
            ref="editor"
            size={this.getCellSize()}
            grid={this.composition.grid}
            clues={this.composition.clues}
            updateGrid={this.updateGrid.bind(this)}
            updateClues={this.updateClues.bind(this)}
            onFlipColor={this.flipColor.bind(this)}
            myColor={this.color}
            pid={this.pid}
          />
        </div>
      </div>
    );
  }

  render() {
    return (
      <div className="compose">
        <div className="compose--left">
          <div className="compose--left--top">
            <h2> Your Puzzles </h2>
          </div>
          <div className="compose--left--list">
            {this.state.myCompositions.map((entry, i) => (
              <div
                key={i}
                onClick={this.selectComposition.bind(this, entry.cid)}
                className="compose--left--list--entry"
              >
                <div>
                  {entry.title} ({entry.dims.rows} x {entry.dims.cols})
                </div>
              </div>
            ))}
          </div>
          <div className="compose--left--new">
            <h2> New Puzzle </h2>
            <Create onCreate={this.newComposition.bind(this)} />
          </div>
        </div>
        {this.renderMain()}
        <div className="compose--right">
          <div className="compose--right--top">
            <h2> Instructions </h2>
            <div>
              <p>Here you can browse, edit or create new puzzles.</p>

              <p> Click on the grid, and use arrow keys to navigate the grid.</p>

              <p>Press Enter to edit the clue for the word that's currently selected.</p>
            </div>
          </div>
          <div className="compose--right--bottom">
            {this.cid ? (
              <div>
                <h2> Share your puzzle </h2>

                {this.composition.published ? (
                  <div>
                    <p>
                      You published{' '}
                      <a href={`/puzzle/${this.composition.published.pid}`}>
                        Puzzle {this.composition.published.pid}
                      </a>
                    </p>
                    <div className="published--update">
                      Updated: <RelativeTime date={this.composition.published.date} />
                      <div className="button" onClick={this.republish.bind(this)}>
                        Republish
                      </div>
                    </div>
                    {this.composition.published.private ? (
                      <div className="button" onClick={this.makePublic.bind(this)}>
                        Make Public
                      </div>
                    ) : (
                      <div className="button" onClick={this.makePrivate.bind(this)}>
                        Make Private
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    Published puzzles will not appear on the home page of Down for a Cross unless you mark
                    them as public
                    <div className="button" onClick={this.publish.bind(this)}>
                      Publish
                    </div>
                  </div>
                )}
                <div>
                  <h2> Delete your puzzle </h2>
                  <div className="button" onClick={this.exportToPuz.bind(this)}>
                    Export as puz file
                  </div>
                </div>
                <div className="button" onClick={this.exportToPuz.bind(this)}>
                  Export as puz file
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}
