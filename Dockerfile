# Build:
# docker build --no-cache -t task-4-node .

# Run (3000 from config; 8081 for Websockets):
# docker run -d -p 3000:3000 -p 8081:8081 --net="host" --rm -it task-4-node

FROM node:8

ENV PORT=3000
ENV PORT2=8081

RUN mkdir /app

WORKDIR /app

COPY . /app

RUN git clone https://github.com/yoksel/test-git.git test-git

WORKDIR /app/test-git

# Get all branches
RUN for branch in $(git branch --all | grep '^\s*remotes' | egrep --invert-match '(:?HEAD|master)$'); do git branch --track "${branch##*/}" "$branch"; done

WORKDIR /app

RUN npm install --production

EXPOSE $PORT $PORT2

CMD npm start
