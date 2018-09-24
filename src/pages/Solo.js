import './css/solo.css';
import Game from './Game';
import actions from '../actions';

export default class Solo extends Game {
  gameDoesNotExist(cbk) {
    const pid = this.props.match.params.pid;
    actions.createGame(
      {
        name: 'Public Game',
        pid: pid,
        gid: this.computeGid(),
      },
      (gid) => {
        cbk && cbk();
      }
    );
  }

  computeGid() {
    const pid = this.props.match.params.pid;
    return `solo/${this.user.id}/${pid}`;
  }

  computeColor() {
    return 'rgb(118, 226, 118)';
  }

  shouldRenderChat() {
    // solo games don't have chat
    return false;
  }
}
