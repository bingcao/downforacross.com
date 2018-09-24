import './css/welcomev2.css';

import React, {Component} from 'react';
import {Helmet} from 'react-helmet';
import Flex from 'react-flexview';
import _ from 'lodash';
import Nav from '../components/Nav';
import Upload from '../components/Upload';
import {getUser, PuzzlelistModel} from '../store';
import PuzzleList from '../components/PuzzleList';
import {isMobile} from '../jsUtils';

export default class WelcomeV2 extends Component {
  constructor() {
    super();
    this.state = {
      puzzles: [],
      userHistory: {},
      pages: 0,
      statusFilter: {
        Complete: true,
        'In progress': true,
        New: true,
      },
      sizeFilter: {
        Mini: true,
        Standard: true,
      },
      search: '',
    };
    this.loading = false;
    this.mobile = isMobile();
  }

  componentDidMount() {
    this.initializePuzzlelist();
    this.initializeUser();
  }

  componentWillUnmount() {
    this.user.offAuth(this.handleAuth);
  }

  handleAuth = () => {
    if (this.user.fb) {
      this.user.listUserHistory().then((userHistory) => {
        this.setState({userHistory});
      });
    }
  };

  initializeUser() {
    this.user = getUser();
    this.user.onAuth(this.handleAuth);
  }

  get done() {
    const {pages, puzzles} = this.state;
    return puzzles.length < pages * this.puzzleList.pageSize;
  }

  get showingSidebar() {
    // eventually, allow mobile to toggle sidebar
    return !this.mobile;
  }

  nextPage = () => {
    const {pages} = this.state;
    if (this.loading || this.done) {
      return;
    }
    this.loading = true;
    this.puzzleList.getPages(pages + 1, (page) => {
      this.setState(
        {
          puzzles: page,
          pages: pages + 1,
        },
        () => {
          this.loading = false;
        }
      );
    });
  };

  initializePuzzlelist() {
    this.puzzleList = new PuzzlelistModel();
    this.nextPage();
  }

  renderPuzzles() {
    const {userHistory, puzzles, sizeFilter, statusFilter, search} = this.state;
    return (
      <PuzzleList
        puzzles={puzzles}
        userHistory={userHistory}
        sizeFilter={sizeFilter}
        statusFilter={statusFilter}
        search={search}
        onNextPage={this.nextPage}
      />
    );
  }

  handleCreatePuzzle = () => {
    this.setState({
      pages: 0,
    });
    this.nextPage();
  };

  handleFilterChange = (header, name, on) => {
    const {sizeFilter, statusFilter} = this.state;
    if (header === 'Size') {
      this.setState({
        sizeFilter: {
          ...sizeFilter,
          [name]: on,
        },
      });
    } else if (header === 'Status') {
      this.setState({
        statusFilter: {
          ...statusFilter,
          [name]: on,
        },
      });
    }
  };

  updateSearch = _.debounce((search) => {
    this.setState({search});
  }, 250);

  handleSearchInput = (e) => {
    const search = e.target.value;
    this.updateSearch(search);
  };

  renderFilters() {
    const {sizeFilter, statusFilter} = this.state;
    const headerStyle = {
      fontWeight: 600,
      marginTop: 10,
      marginBottom: 10,
    };
    const groupStyle = {
      padding: 20,
    };
    const inputStyle = {
      margin: 'unset',
    };

    const checkboxGroup = (header, items, handleChange) => (
      <Flex column style={groupStyle} className="checkbox-group">
        <span style={headerStyle}>{header}</span>
        {_.keys(items).map((name, i) => (
          <label
            key={i}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
          >
            <input
              type="checkbox"
              style={inputStyle}
              checked={items[name]}
              onChange={(e) => {
                handleChange(header, name, e.target.checked);
              }}
            />
            <div className="checkmark" />
            {name}
          </label>
        ))}
      </Flex>
    );

    return (
      <Flex className="filters" column hAlignContent="left" shrink={0}>
        {checkboxGroup('Size', sizeFilter, this.handleFilterChange)}
        {checkboxGroup('Status', statusFilter, this.handleFilterChange)}
      </Flex>
    );
  }

  renderSearch() {
    const {search} = this.state;
    const style = {
      fontSize: 16,
      padding: 5,
      width: 735,
      borderRadius: 3,
      border: '2px solid silver',
    };
    return (
      <Flex
        style={{
          padding: 25,
          borderBottom: '2px solid #6AA9F4',
        }}
        shrink={0}
      >
        <input placeholder="Search" onInput={this.handleSearchInput} val={search} style={style} />
      </Flex>
    );
  }

  renderQuickUpload() {
    return (
      <Flex className="quickplay" style={{width: 200}}>
        <Upload v2 onCreate={this.handleCreatePuzzle} />
      </Flex>
    );
  }

  render() {
    return (
      <Flex className="welcomev2" column grow={1}>
        <Helmet>
          <title>Down for a Cross</title>
        </Helmet>
        <div className="welcomev2--nav">
          <Nav v2 />
        </div>
        <Flex grow={1} basis={1}>
          {this.showingSidebar && (
            <Flex className="welcomev2--sidebar" column shrink={0} style={{justifyContent: 'space-between'}}>
              {this.renderFilters()}
              {!this.mobile && this.renderQuickUpload()}
            </Flex>
          )}
          <Flex className="welcomev2--main" column grow={1}>
            {this.renderSearch()}
            {this.renderPuzzles()}
          </Flex>
        </Flex>
      </Flex>
    );
  }
}
