const { rejects } = require('assert');
const axios = require('axios');
const e = require('express');
const fs = require('fs');
const { resolve } = require('path');
const { comment } = require('postcss');

const lists = [
  'games',
  'apps',
  'distros',
  'communities',
  'dev'
];

//axios.defaults.baseURL = 'https://mastodon.social/api/v1';
axios.defaults.baseURL = 'https://fosstodon.org/api/v1';

const writeAllListStream = fs.createWriteStream(`./assets/lists/all.json`);
let allContent = [];

const getList = (list) => {
  return new Promise ( resolve => {
    try {
      let accounts = [];
      let content = [];

      const writeListStream = fs.createWriteStream(`./assets/lists/${list}.json`);

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
              const arr = {
                username: data.username,
                acct: data.acct,
                display_name: data.display_name,
                avatar: data.avatar,
                header: data.header,
                url: data.url,
                note: data.note,
                domain: domain.hostname
              }
              content.push(arr);
              allContent.push(arr);
            }
          });
          content.sort((a, b) => {
            let fa = a.display_name.toLowerCase(),
                fb = b.display_name.toLowerCase();
        
            if (fa < fb) return -1;
            if (fa > fb) return 1;
            return 0;
          });
          
          writeListStream.write(JSON.stringify(content));
          resolve(content);
        })
      );
    } catch (error) {
      console.error(error);
    }
  });
}

const getData = async () => {
  let promises = [];

  lists.forEach(list => {
    promises.push(getList(list));
  });

  await Promise.all(promises).then( data => {
    allContent = [].concat(...data)
    allContent.sort((a, b) => {
      let fa = a.display_name.toLowerCase(),
          fb = b.display_name.toLowerCase();
  
      if (fa < fb) return -1;
      if (fa > fb) return 1;
      return 0;
    });
  });
  writeAllListStream.write(JSON.stringify(allContent));
}

getData();
