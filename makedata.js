const axios = require('axios');
const fs = require('fs');
const YAML = require('yaml')

const lists = [
  'games',
  'apps',
  'os',
  'communities',
  'dev'
];

const accts2merge = {};
const tags2merge = {};

lists.forEach( (list) => accts2merge[list] = []);

//const api_url = 'https://fosstodon.org/api/v1';
const api_url = 'https://mastodon.social/api/v1';
//axios.defaults.baseURL = 'https://mastodon.social/api/v1';
axios.defaults.baseURL = api_url;

const getList = (list, accounts) => {
  let content = listData(list);

  return new Promise ( resolve => {
    try {
      Promise.all(
          accounts.map((account) => axios.get('/accounts/lookup', {
            params: {
              acct: account.acct
            }
          })
        )).then(
          axios.spread( async(...allResp) => {
            allResp.forEach((resp) => {
              if (!resp.data.error) {
                const data = resp.data;
                const domain = (new URL(data.url));
                const domainAPI = new URL(api_url)
                const extra_data = accounts.find( account => account.acct == `${data.username}@${domain.hostname}`)
                const arr = {
                  username: data.username,
                  acct: (domainAPI.hostname == domain.hostname)
                    ? `${data.acct}@${domainAPI.hostname}` : data.acct,
                  display_name: data.display_name,
                  avatar: data.avatar,
                  header: data.header,
                  url: data.url,
                  note: data.note,
                  domain: domain.hostname,
                  langs: extra_data.langs,
                  tags: extra_data.tags,
                  base: (!!extra_data.base) ? extra_data.base : null,
                  licenses: (!!extra_data.licenses) ? extra_data.licenses : null,
                  repo: (!!extra_data.repo) ? extra_data.repo : null,
                  web: (!!extra_data.web) ? extra_data.web : null,
                }
                content.push(arr);
                accts2merge[list].push(arr);

                extra_data.tags.forEach( tag => {
                  if (!tags2merge[tag]) tags2merge[tag] = []
                  tags2merge[tag].push(arr)
                })
              }
            });

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

  lists.forEach(async list => {
    let accounts = [];
    const prevAccts = getListAccts(listData(list));
    const perCall = 10;

    const file = fs.readFileSync(`_lists/${list}.yml`, 'utf-8');
	  const accountList = YAML.parse(file)

    accountList.forEach(item => {
      if (!prevAccts.includes(item.acct)) accounts.push(item);
    });

    if (accounts.length == 0) return;

    const totalPages = Math.ceil(accounts.length / perCall);

    for (let page = 1; page <= totalPages; page++) {
      const offset = perCall * (page - 1);
      const paginatedAccounts = accounts.slice(offset, perCall * page);
      promises.push(getList(list, paginatedAccounts));
    }

    await Promise.all(promises).then( data => {
      let newAllContent = [].concat(...data);
      if (newAllContent.length == 0) return;
      
      allContent.push(...newAllContent);

      allContent = [...new Map(allContent.map(v => [v.acct, v])).values()]
      
      allContent = sortArray(allContent)

      const writeAllListStream = fs.createWriteStream(`./assets/lists/all.json`);
      writeAllListStream.write(JSON.stringify(allContent, null, 2));
      
      if (accts2merge[list].length > 0) {
        let accts = [];
        const writeListStream = fs.createWriteStream(`./assets/lists/${list}.json`);
        accts = [...listData(list), ...accts2merge[list]];
        accts = sortArray(accts);
        writeListStream.write(JSON.stringify(accts, null, 2));
      }

      for (const [key, val] of (Object.entries(tags2merge))) {
        if (tags2merge[key].length > 0) {
          let accts = [];
          const writeListStream = fs.createWriteStream(`./assets/tags/${key}.json`);
          accts = [...listTags(key), ...tags2merge[key]];
          accts = sortArray(accts);
          writeListStream.write(JSON.stringify(accts, null, 2));

          if (!fs.existsSync(`./_tags/${key}.html`)) {
            const genTagPage = fs.createWriteStream(`./_tags/${key}.html`);
            genTagPage.write(`---
layout: default
title: "Tag: ${key}"
permalink: /tag/${key}
---
{% include tag.html tag='${key}' %}
            `);
          }
        }
      }
    });
  });
}

const getListAccts = (data) => {
  const accounts = [];
  data.forEach( account => {
    accounts.push(account.acct)
  });

  return accounts;
}

/**
 * Devuelve un array de objetos con las cuentas
 * @param {*} list
 * @returns El array con los datos
 */
const listData = (list) => {
  try {
    const content = fs.readFileSync(`assets/lists/${list}.json`, 'utf-8').trim();
    if (content) return JSON.parse(content);
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Devuelve un array de objetos con las etiquetas
 * @param {*} list
 * @returns El array con los datos
 */
const listTags = (list) => {
  try {
    const content = fs.readFileSync(`assets/tags/${list}.json`, 'utf-8').trim();
    if (content) return JSON.parse(content);
    return [];
  } catch (error) {
    return [];
  }
}

const sortArray = arr => {
  arr.sort((a, b) => {
    let fa = a.display_name.toLowerCase(),
        fb = b.display_name.toLowerCase();
  
    if (fa < fb) return -1;
    if (fa > fb) return 1;

    return;
  });

  return arr;
}

let allContent = listData('all');

getData();
