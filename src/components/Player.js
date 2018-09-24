import './css/player.css';

import React, {Component} from 'react';
import Flex from 'react-flexview';

import {lazy} from '../jsUtils';

import GridObject from '../utils/Grid';

import Grid from './Grid';
import Clues from './Clues';
import Clue from './ClueText';
import GridControls from './GridControls';
import MobileGridControls from './MobileGridControls';

import * as gameUtils from '../gameUtils';

/*
 * Summary of Player component
 *
 * Props: { grid, clues, updateGrid }
 *
 * State: { selected, direction, mobileMode }
 *
 * Children: [ GridControls, Grid, Clues ]
 * - GridControls.props:
 *   - attributes: { selected, direction, grid, clues }
 *   - callbacks: { setSelected, setDirection }
 * - Grid.props:
 *   - attributes: { grid, selected, direction }
 *   - callbacks: { setSelected, changeDirection }
 * - Clues.props:
 *   - attributes: { getClueList(), selected, halfSelected }
 *   - callbacks: { selectClue }
 *
 * Potential parents (so far):
 * - Room
 * - SoloRoom
 **/

export default class Player extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selected: {
        r: 0,
        c: 0,
      },
      direction: 'across',
      mobile: false,
    };

    // for deferring scroll-to-clue actions
    this.prvNum = {};
    this.prvIdleID = {};
    this._isClueSelected = this.isClueSelected.bind(this);
    this._isClueHalfSelected = this.isClueHalfSelected.bind(this);
    this._isClueFilled = this.isClueFilled.bind(this);
    this._selectClue = this.selectClue.bind(this);
    this._scrollToClue = this.scrollToClue.bind(this);
    this._setDirection = this.setDirection.bind(this);
    this._canSetDirection = this.canSetDirection.bind(this);
    this._setSelected = this.setSelected.bind(this);
    this._changeDirection = this.changeDirection.bind(this);
  }

  get grid() {
    return new GridObject(this.props.grid);
  }

  get selected() {
    let {r, c} = this.state.selected;
    while (!this.grid.isWhite(r, c)) {
      if (c < this.props.grid[0].length) {
        c += 1;
      } else {
        r += 1;
        c = 0;
      }
    }
    return {r, c};
  }

  focus() {
    this.refs.gridControls && this.refs.gridControls.focus();
  }

  /* Callback fns, to be passed to child components */

  isValidDirection(direction, selected) {
    return this.grid.getParent(selected.r, selected.c, direction) !== 0;
  }

  canSetDirection(direction) {
    return this.isValidDirection(direction, this.selected);
  }

  setDirection(direction) {
    if (this.isValidDirection(direction, this.selected)) {
      this.setState({
        direction: direction,
      });
    }
  }

  setSelected(selected) {
    if (this.isValidDirection(this.state.direction, selected)) {
      if (selected.r !== this.selected.r || selected.c !== this.selected.c) {
        this.setState(
          {
            selected: selected,
          },
          () => {
            this.props.updateCursor({
              r: selected.r,
              c: selected.c,
            });
          }
        );
      }
    } else if (this.isValidDirection(gameUtils.getOppositeDirection(this.state.direction), selected)) {
      this.setState(
        {
          selected: selected,
          direction: gameUtils.getOppositeDirection(this.state.direction),
        },
        () => {
          this.props.updateCursor({
            r: selected.r,
            c: selected.c,
          });
        }
      );
    }
  }

  changeDirection() {
    this.setDirection(gameUtils.getOppositeDirection(this.state.direction));
  }

  selectClue(direction, number) {
    this.refs.gridControls.selectClue(direction, number);
  }

  /* Helper functions used when rendering */

  getClueBarAbbreviation() {
    return this.getSelectedClueNumber() + this.state.direction.substr(0, 1).toUpperCase();
  }

  getClueBarText() {
    return this.props.clues[this.state.direction][this.getSelectedClueNumber()];
  }

  getSelectedClueNumber() {
    return this.grid.getParent(this.selected.r, this.selected.c, this.state.direction);
  }

  getHalfSelectedClueNumber() {
    return this.grid.getParent(
      this.selected.r,
      this.selected.c,
      gameUtils.getOppositeDirection(this.state.direction)
    );
  }

  isClueFilled(direction, number) {
    const clueRoot = this.grid.getCellByNumber(number);
    return !this.grid.hasEmptyCells(clueRoot.r, clueRoot.c, direction);
  }

  isClueSelected(direction, number) {
    return direction === this.state.direction && number === this.getSelectedClueNumber();
  }

  isClueHalfSelected(direction, number) {
    return direction !== this.state.direction && number === this.getHalfSelectedClueNumber();
  }

  isHighlighted(r, c) {
    return this.refs.grid.isHighlighted(r, c);
  }

  isSelected(r, c) {
    return this.refs.grid.isSelected(r, c);
  }

  /* Public functions, called by parent components */

  getAllSquares() {
    return this.grid.keys().map(([r, c]) => ({r, c}));
  }

  getSelectedAndHighlightedSquares() {
    return this.getAllSquares().filter(({r, c}) => this.isSelected(r, c) || this.isHighlighted(r, c));
  }

  getSelectedSquares() {
    return this.getAllSquares().filter(({r, c}) => this.isSelected(r, c));
  }

  getReferences() {
    const {clues} = this.props;
    const clueText = this.getClueBarText();
    return gameUtils.getReferencedClues(clueText, clues);
  }

  /* Misc functions */

  // Interacts directly with the DOM
  // Very slow -- use with care
  scrollToClue(dir, num, el) {
    if (el && this.prvNum[dir] !== num) {
      this.prvNum[dir] = num;
      lazy('scrollToClue' + dir, () => {
        const parent = el.offsetParent;
        if (parent) {
          parent.scrollTop = el.offsetTop - parent.offsetHeight * 0.4;
        }
      });
    }
  }

  renderMobileClueBar() {
    return (
      <Flex className="player--mobile--clue-bar">
        <div className="player--mobile--clue-bar--number">
          <Clue text={this.getClueBarAbbreviation()} />
        </div>
        <Flex className="player--mobile--clue-bar--text" grow={1}>
          <Clue text={this.getClueBarText()} />
        </Flex>
        <i className="player--mobile--typing-hint fa fa-6 fa-keyboard-o" />
      </Flex>
    );
  }

  /* Render */
  render() {
    const {
      mobile,
      onPressEnter,
      onPressPeriod,
      size,
      grid,
      clues,
      circles,
      shades,
      cursors: allCursors = [],
      updateGrid,
      frozen,
      myColor,
      id,
    } = this.props;

    const cursors = allCursors.filter((cursor) => cursor.id !== id);
    const {direction} = this.state;
    const selected = this.selected;

    if (mobile) {
      return (
        <div className="player--mobile--wrapper mobile">
          <MobileGridControls
            ref="mobileGridControls"
            onPressEnter={onPressEnter}
            onPressPeriod={onPressPeriod}
            selected={selected}
            direction={direction}
            onSetDirection={this._setDirection}
            canSetDirection={this._canSetDirection}
            onSetSelected={this._setSelected}
            updateGrid={updateGrid}
            grid={grid}
            clues={clues}
          >
            <div className="player--mobile">
              {this.renderMobileClueBar()}

              <div className={'player--mobile--grid' + (frozen ? ' frozen' : '')}>
                <Grid
                  ref="grid"
                  size={size}
                  grid={grid}
                  circles={circles}
                  selected={selected}
                  references={this.getReferences()}
                  direction={direction}
                  cursors={cursors}
                  onSetSelected={this._setSelected}
                  myColor={myColor}
                  onChangeDirection={this._changeDirection}
                />
              </div>

              {this.renderMobileClueBar()}
            </div>
          </MobileGridControls>
        </div>
      );
    }

    return (
      <div className="player--main--wrapper">
        <GridControls
          ref="gridControls"
          onPressEnter={onPressEnter}
          onPressPeriod={onPressPeriod}
          selected={selected}
          direction={direction}
          onSetDirection={this._setDirection}
          canSetDirection={this._canSetDirection}
          onSetSelected={this._setSelected}
          updateGrid={updateGrid}
          grid={grid}
          clues={clues}
        >
          <div className="player--main">
            <div className="player--main--left">
              <div className="player--main--clue-bar">
                <div className="player--main--clue-bar--number">{this.getClueBarAbbreviation()}</div>
                <div className="player--main--clue-bar--text">
                  <Clue text={this.getClueBarText()} />
                </div>
              </div>

              <div className={'player--main--left--grid' + (frozen ? ' frozen' : '') + ' blurable'}>
                <Grid
                  ref="grid"
                  size={size}
                  grid={grid}
                  circles={circles}
                  shades={shades}
                  selected={selected}
                  references={this.getReferences()}
                  direction={direction}
                  cursors={cursors}
                  onSetSelected={this._setSelected}
                  myColor={myColor}
                  onChangeDirection={this._changeDirection}
                />
              </div>
            </div>

            <div className="player--main--clues">
              <Clues
                clues={this.props.clues}
                clueLengths={this.grid.clueLengths}
                isClueSelected={this._isClueSelected}
                isClueHalfSelected={this._isClueHalfSelected}
                isClueFilled={this._isClueFilled}
                scrollToClue={this._scrollToClue}
                selectClue={this._selectClue}
              />
            </div>
          </div>
        </GridControls>
      </div>
    );
  }
}
