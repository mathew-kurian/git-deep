# Git Deep

![](screenshot.png)

```bash
yarn global add git-deep
```

## Examples
```bash
$ git-deep 'git status'
$ git-deep 'git add -n -am "Updated module"'
$ git-deep 'git commit -n -am "Updated module"'
$ git-deep 'git push'
```

### Optional Arguments
- `-c, --childrenOnly`: Run command on children only
- `-p, --parallel`: Run commands in parallel

