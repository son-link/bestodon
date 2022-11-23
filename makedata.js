const axios = require('axios');
const fs = require('fs');

const lists = [
  'games',
  'apps',
  'distros',
  'communities',
  'dev'
];

const accts2merge = {};

lists.forEach( (list) => accts2merge[list] = []);

const api_url = 'https://fosstodon.org/api/v1';
//axios.defaults.baseURL = 'https://mastodon.social/api/v1';
axios.defaults.baseURL = api_url;

const getList = (list, accounts) => {
  const date = new Date();
  const dateMark = `${date.getFullYear()}${date.getMonth()}${date.getDay()}${date.getHours()}${date.getMinutes()}${date.getSeconds()}`;
  let content = listData(list);

  return new Promise ( resolve => {
    try {
      Promise.all(
          accounts.map((account) => axios.get('/accounts/lookup', {
            params: {
              acct: account
            }
          })
        )).then(
          axios.spread( async(...allResp) => {
            allResp.forEach((resp) => {
              if (!resp.data.error) {
                const data = resp.data;
                const domain = (new URL(data.url));
                const domainAPI = new URL(api_url)
                const acct = (domain.hostname)
                const arr = {
                  username: data.username,
                  acct: (domainAPI.hostname == domain.hostname)
                    ? `${data.acct}@${domainAPI.hostname}` : data.acct,
                  display_name: data.display_name,
                  avatar: data.avatar,
                  header: data.header,
                  url: data.url,
                  note: data.note,
                  domain: domain.hostname
                }
                content.push(arr);
                accts2merge[list].push(arr);
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

    fs.readFileSync(`_lists/${list}`, 'utf-8').split('\n').forEach(line => {
      line = line.trim();
      if (line && !prevAccts.includes(line)) accounts.push(line);
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
