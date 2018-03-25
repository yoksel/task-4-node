function exec(cmd) {
  if (cmd === 'git branch') {
    return '  add-menu 8e348c9 Change headers color\n' +
           '* master   be1bf29 Change header level in readme\n' +
           '  pictures 79e141f Add home icon';
  } else if (cmd === 'git log') {
    return 'be1bf29|yokselzok|yokselzok@gmail.com|15 hours ago|Change header level in readme\n' +
          '96392ff|yokselzok|yokselzok@gmail.com|15 hours ago|Add styles';
  }

  return cmd;
}

module.exports = {
  exec: exec
};
