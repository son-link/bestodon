const axios = require('axios');
const fs = require('fs');
const { comment } = require('postcss');
const YAML = require('yaml');

const lists = [
  'games',
  'software'
];

let allData = [];

//axios.defaults.baseURL = 'https://mastodon.social/api/v1';
axios.defaults.baseURL = 'https://todon.eu/api/v1';

const writeAllListStream = fs.createWriteStream(`./_data/all.yml`);

lists.forEach(list => {
  let accounts = [];
  let content = [];

  const writeListStream = fs.createWriteStream(`./_data/${list}.yml`);

  fs.readFileSync(`_lists/${list}`).toString().split('\n').forEach(line => {

    line = line.trim();
    if (line) {
      accounts.push(line);
    }
  });
  
  Promise.all(
    accounts.map((account) => axios.get('/accounts/lookup', {
      params: {
        acct: account
      }
    })
  )).then(
    axios.spread((...allResp) => {
      allResp.forEach((resp) => {
        if (!resp.data.error) {
          const data = resp.data;
          const domain = (new URL(data.url));
          content.push({
            username: data.username,
            acct: data.acct,
            display_name: data.display_name,
            avatar: data.avatar,
            header: data.header,
            url: data.url,
            note: data.note,
            domain: domain.hostname
          });
        }
      });
      writeListStream.write(YAML.stringify(content));
      writeAllListStream.write(YAML.stringify(content));
    })
  );
});

