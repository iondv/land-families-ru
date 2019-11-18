/**
 * Created by akumidv on 22.11.2016.
 */

/* eslint no-console: "off", no-process-env: off */

const path = require('path');
const fs = require('fs');
const Parserdbf = require('node-dbf').default;

const {compareObjects} = require('convert-import'); // Не используется updateImportedFiles
const util = require('util');

const {showPersonNameObj, showPersonNameId} = require('./import-dbf/model-person');
const {showFamilyIndex} = require('./import-dbf/model-family'); // Не используется showFamilyObj

const cryptoRandom = require('crypto').randomBytes;

module.exports.importedBeforeReference = require('./import-dbf/reference-before.json');
module.exports.importedAfterReference = require('./import-dbf/reference-after.json');

module.exports.options = {
  saveAll: false, // Сохранять все объекты сразу, а не каждую итерацию и соответственно не очищать
  zip: true, // Архивировать выдачу
  // zipIgnore: /(declaration@land-families-ru)/, // Не архивировать классы
  skipClassName: ['declaration@land-families-ru', 'person@land-families-ru', 'family@land-families-ru',  // Классы, которые не удаляются в партиях
    'acceptedDecision@land-families-ru', 'adressDistrict@land-families-ru', 'adressTown@land-families-ru',
    'adressStreet@land-families-ru"', 'document@land-families-ru', 'removal@land-families-ru']
};

const classNames = require('./import-dbf/class-names.json');
const CN_DECLAR = classNames.declar;
const CN_REMOVAL = classNames.removal;
const CN_FAMILY = classNames.family;
const CN_PERSON = classNames.person;
const CN_ADRESS = classNames.adress;
const CN_DOCUMENT = classNames.document;
const CN_DECISION = classNames.acceptedDecision;
const convertEarth = require('./import-dbf/convert-earth');
const convertEarthS = require('./import-dbf/convert-earth-s');
const {convertAdress} = require('./import-dbf/model-adress');

const initFilesList = ['earth.dbf', // Заявления и решения
  'ray.dbf', 'town.dbf', 'street.dbf', // Адреса
  'earth_s.dbf']; // Состав семьи


/**
 * Список дирректорий для импорта, может быть одна и пустая, если нужно импортировать
 * @type {String[]}
 */
module.exports.importedFolders = getDir('i:/earth/dbf');

/**
 * Функция формирования списка и считывания значений файлов импорта
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.meta - структура метаданных, наименование объекта - класс с неймспейсом: adminTerritory@khv-svyaz-info
 * @param {Object} importedData.parsed - объект с импортируемыми данными, где имена свойств имена исходных файлов
 * @param {Object} importedData.path - путь к папкам импортируемых данных
 * @param {Object} importedData.pathData - путь к папке сохранения результатов импорта
 * @param {Array} importedData.parsed.earth - заявления из БД earth
 * @param {Array} importedData.parsed.earth_s - семьи из БД earth_s
 * @param {Array} importedData.nkarExclusion - массив записей для формирования таблицы исключений - замены родителей в семьях
 * @param {Object} importedData.reference - обюъект с массивами объектов справочников в формате JSON, где имя свойства - имя класса с неймспоейсом: adminTerritory@khv-svyaz-info
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения - массив данных импорта
 * @param {Object} importedData.verify  - именнованный массив классов, с ключами из id объектов для верификации
 * @returns {Promise} - промиз
 */
function convertImportedFiles(importedData) {
  return new Promise(((resolve, reject) => {
    try {
      for (const key in classNames) { // Проверяем, и создаем если нужно массивы для объектов классов
        if (classNames.hasOwnProperty(key)) {
          if (!importedData.result[classNames[key]]) {
            importedData.result[classNames[key]] = [];
          }
          if (!importedData.verify[classNames[key]]) {
            importedData.verify[classNames[key]] = {}; // Именнованные по ключу сокращенные объекты
          }
        }
      }
      importedData.nkarExclusion = importedData.nkarExclusion ? importedData.nkarExclusion : []; // Формирование списка исключений по одинаковым nkar, когда отличаются родители одного пола

      convertAdress(importedData)
        .then(convertEarth)
        .then(convertEarthS)
      //        .then(setAutoicrenentDeclarRefference)
        .then(depersonalize)
        .then((importedData) => {
          return resolve(importedData);
        })
        .catch((err) => {
          return reject(err);
        });
    } catch (err) {
      console.error('Ошибка конвертации импортируемых данных ', err);
      return reject(err);
    }
  }));
}
module.exports.convertImportedFiles = convertImportedFiles;

let depersonilezeOnceWarning = false;
// Деперсонализируем, если нужно - т.е. переменная оркужения IMPORT содержит PRIVATE
function depersonalize(importedData) {
  return new Promise(((resolve, reject) => {
    try {
      const PRIVATE_DATA = process.env.IMPORT ? process.env.IMPORT.includes('PRIVATE') : false;
      if (!depersonilezeOnceWarning) {
        console.info('(!) ЗНАЧЕНИЕ ПАРАМЕТРА PRIVATE ДЛЯ ДЕПЕРСОНАЛИЗАЦИИ ДАННЫХ ПРИ СОХРАНЕНИИ В IMPORT',
          PRIVATE_DATA);
        depersonilezeOnceWarning = true;
      }
      if (PRIVATE_DATA) {
        for (let i = 0; i < importedData.result[CN_PERSON].length; i++) {
          if (importedData.result[CN_PERSON][i]) {
            importedData.result[CN_PERSON][i].surname = cryptoRandom(10).toString('hex');
            importedData.result[CN_PERSON][i].name = cryptoRandom(5).toString('hex');
            importedData.result[CN_PERSON][i].patronymic = cryptoRandom(3).toString('hex');
            if (importedData.result[CN_PERSON][i].dateBorn) {
              importedData.result[CN_PERSON][i].dateBorn.setMonth(0, 1);
            }
          }
        }
        for (let i = 0; i < importedData.result[CN_ADRESS].length; i++) {
          if (importedData.result[CN_ADRESS][i]) {
            importedData.result[CN_ADRESS][i].house = '0';
            importedData.result[CN_ADRESS][i].building = '';
            importedData.result[CN_ADRESS][i].flat = '0';
          }
        }
        for (let i = 0; i < importedData.result[CN_DOCUMENT].length; i++) {
          if (importedData.result[CN_DOCUMENT][i]) {
            importedData.result[CN_DOCUMENT][i].numDoc = cryptoRandom(6).toString('hex');
            importedData.result[CN_DOCUMENT][i].org = cryptoRandom(15).toString('hex');
            if (importedData.result[CN_DOCUMENT][i].date) {
              importedData.result[CN_DOCUMENT][i].date.setMonth(0, 1);
            }
          }
        }
        return resolve(importedData);
      }
    } catch (err) {
      console.error('Ошибка деперсонализации данных', err);
      reject(err);
    }
    return resolve(importedData);
  }));
}

/**
 *  Функция постобработки заявлений и решений по ним, для удаления дубетов по следующей логике
 * https://ion-dv.atlassian.net/browse/KHVCHILDZM-98
 * Есть два заявления 11-000000002185 all\11 и 11-100000000330 all\12 и у каждого свое решение о постановке на учет.
 * При этом исходные номера заявлений одинаковые 0000001811
 * Нужно после импорта, перед проставлением уникальных номеров заявлений:
 * - удалить дублирующие заявления данной персоны по исходному номеру и дате. Т.е. уникальность: персона,
 *   исходный номер заявления, дата заявления. При этом должно удалиться то заявление, где в базе нет номера очереди
 * - перепривязать с удаляемого заявления "Решение о постановке или отказе" на итоговое заявление
 *  Для случаев, где есть заявлени, и у него такая же дата и изначальный номер заявления - но у одного есть решение,
 * а у другого нет решения - удалить то заявления, где нет решения.
 *
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения - массив данных импорта
 * @returns {Object} importedData
 */
function removeDubletDeclaration(importedData) {
  if (!Array.isArray(importedData.result[CN_DECLAR]) || !Array.isArray(importedData.result[CN_DECISION])) {
    return importedData;
  }
  const personDeclarations = {};
  for (let i = 0; i < importedData.result[CN_DECLAR].length; i++) { // Формируем массив заявлений по персоне
    if (!personDeclarations[importedData.result[CN_DECLAR][i].app]) {
      personDeclarations[importedData.result[CN_DECLAR][i].app] = [];
    }
    personDeclarations[importedData.result[CN_DECLAR][i].app].push({
      id: importedData.result[CN_DECLAR][i].id,
      regNumOld: importedData.result[CN_DECLAR][i].regNumOld, orderNum: importedData.result[CN_DECLAR][i].orderNum
    });
  }
  const dubletDeclarations = [];
  Object.keys(personDeclarations).forEach((idPerson) => { // Фильтруем массив в массиве дублеты
    if (personDeclarations[idPerson].length > 1) { // Только персоны, у которых больше двух заявлений
      const regNumDeclar = {};
      for (let j = 0; j < personDeclarations[idPerson].length - 1; j++) { // Формируем объект с объединением заявлений по regNumOld
        for (let k = j + 1; k < personDeclarations[idPerson].length; k++) {
          if (personDeclarations[idPerson][j].regNumOld === personDeclarations[idPerson][k].regNumOld) { // Нашли дублирующиеся заявления
            const regNumOld = personDeclarations[idPerson][j].regNumOld;
            if (!regNumDeclar[regNumOld]) {
              regNumDeclar[regNumOld] = {};
            }
            regNumDeclar[regNumOld][personDeclarations[idPerson][j].id] = personDeclarations[idPerson][j].orderNum;
            regNumDeclar[regNumOld][personDeclarations[idPerson][k].id] = personDeclarations[idPerson][k].orderNum;
          }
        }
      }
      Object.keys(regNumDeclar).forEach((itemRegNumDeclar) => { // Перебираем объединения заявлений с одинаковым regNumOld
        let declarationIdWitchNumOrder = null;
        const idPersonDeclarations = Object.keys(regNumDeclar[itemRegNumDeclar]); // Всегда минимум два заявления
        const arrDubletDeclar = [];
        for (let i = 0; i < idPersonDeclarations.length; i++) {
          if (regNumDeclar[itemRegNumDeclar][idPersonDeclarations[i]]) { // Содержит или нет orderNum
            if (!declarationIdWitchNumOrder) {
              declarationIdWitchNumOrder = idPersonDeclarations[i];
            }
          } else {
            arrDubletDeclar.push(idPersonDeclarations[i]);
          }
        }
        if (declarationIdWitchNumOrder) { // Если найдены заявления персоны с совпадающими рег.номерами, то в дублеты добавляем с пустыми номерами очереди
          for (let i = 0; i < arrDubletDeclar.length; i++) {
            dubletDeclarations[arrDubletDeclar[i]] = declarationIdWitchNumOrder;
          }
        }
      });
    }
  });
  importedData.result[CN_DECISION].forEach((decision) => {
    if (typeof dubletDeclarations[decision.pet] !== 'undefined') { // Для решений, у которых ссылка на заявление из списка дублетных, меняем на сохраненное заявление
      // decision.pet = dubletDeclarations[decision.pet]; // KHVCHILDZM-189 К сожалению разные решения о снятии привязываются к одному заявлению, а в статистике у них раздельно считается => не считаем дублетами
      delete dubletDeclarations[decision.pet];
    }
  });
  // Удаляем дублирующиеся заявления.
  for (let i = 0; i < importedData.result[CN_DECLAR].length; i++) { // Перебираем массив решений по заявлениям
    if (typeof dubletDeclarations[importedData.result[CN_DECLAR][i].id] !== 'undefined') {
      delete importedData.result[CN_DECLAR][i];
    }
  }
  const tmpLength = importedData.result[CN_DECLAR].length;
  importedData.result[CN_DECLAR] = importedData.result[CN_DECLAR].filter((item) => { // Для пустых (удаленных) элементов не вызывается
    return item;
  });
  console.info('Удалили %s дублирующих заявлений, у которых равны рег.номера(regNumOld)' +
    'и не заполнена очередь(ocherNum). Кол-во заявлений до %s, после %s', Object.keys(dubletDeclarations).length,
  tmpLength, importedData.result[CN_DECLAR].length);
  return importedData;
}

/**
 *  Функция постобработки привязанных к заявлениям решений, в них есть дубли
 * https://ion-dv.atlassian.net/browse/KHVCHILDZM-117
 *  TODO при проверке дублирующих решений (попова любовь), если есть номер и уведомление о решении , а в другом нет номера и уведомления - второе удаляем.
 *
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения - массив данных импорта
 * @returns {Object} importedData
 */
function removeDubletDecision(importedData) {
  if (!Array.isArray(importedData.result[CN_DECISION])) {
    return importedData;
  }
  let qntDubletDecision = 0;
  const decisions = importedData.result[CN_DECISION];
  for (let i = 0; i < decisions.length - 1; i++) { // Формируем массив решений по заявлениям
    for (let j = i + 1; j < decisions.length; j++) {
      if (decisions[i] && decisions[j] && decisions[i].pet === decisions[j].pet) { // Решения для одинаковых заявлений
        const resCompare = compareObjects(decisions[i], decisions[j], ['id', 'date']);
        if (resCompare) {
          /*
           * 4debug - 2del const DECISION_HASH =  importedData.result[CN_DECISION][j].pet + importedData.result[CN_DECISION][j].num + importedData.result[CN_DECISION][j].date;
           * console.log('#### Удаляем дублет решений', DECISION_HASH);
           */
          delete decisions[j];
          qntDubletDecision++;
        } else if (decisions[i].numNotice !== decisions[j].numNotice) {
          if (!decisions[i].numNotice && decisions[j].numNotice) {
            decisions[i].numNotice = decisions[j].numNotice;
            decisions[i].dateNotice = decisions[j].dateNotice;
            delete decisions[j];
            qntDubletDecision++;
          } else if (decisions[i].numNotice && !decisions[j].numNotice) {
            delete decisions[j];
            qntDubletDecision++;
          } else {
            console.info('Уведомление о решении не равны %s и %s для решения №%s заявления %s. Дублет решения не удаляем', decisions[i].numNotice,
              decisions[j].numNotice, decisions[i].num,
              decisions[i].pet);
          }
        } else { // Если номера решений равны
          delete importedData.result[CN_DECISION][j];
          qntDubletDecision++;
        }
      }
    }
  }

  const tmpLength = importedData.result[CN_DECISION].length;
  importedData.result[CN_DECISION] = importedData.result[CN_DECISION].filter((item) => { // Для пустых (удаленных) элементов не вызывается
    return item;
  });
  console.info('Удалили %s дублирующих решений по заявлениям, у которых равны номер решения. ' +
    'Кол-во решений до %s, после %s', qntDubletDecision, tmpLength, importedData.result[CN_DECISION].length);

  return importedData;
}

/**
 *  Функция проверки дублетов заявлений и действий над ними
 * @param {Array} chekedArr - именованный массивом объектов
 * @param {String} checkedKeys - ключ объекта, по которому сравниваются объекты в массиве
 * @param {Object} options - параметры для сравнения
 * @param {Boolean} options.onlyCheckKeys - проверять только совпадение ключей, или полностью объекты
 * @param {Array} options.ignoreKeys - список ключей для игнорирования сравнения объектов
 * @param {Boolean} options.packArray- нужно ли упаковать массив, после действий над ним
 * @param {Function} doubletAction - функция с действиями над дублетами
 * @returns {Array} chekedArr
 */
function checkDubletObjectInArray(chekedArr, checkedKeys, options, doubletAction) {
  /**
   * Функция проверки эквивалентности значений ключей
   * @param {Object} iObj - объект 1
   * @param {Object} jObj - Объект 2
   * @returns {Boolean}
   */
  function isObjectEqual(iObj, jObj) {
    let iVal = '';
    let jVal = '';
    if (!iObj || !jObj) {
      return false;
    }
    if (typeof checkedKeys === 'string') {
      iVal = iObj[checkedKeys];
      jVal = jObj[checkedKeys];
    } else if (Array.isArray(checkedKeys)) {
      for (let k = 0; k < checkedKeys.length; k++) {
        iVal += iObj[checkedKeys[k]];
        jVal += jObj[checkedKeys[k]];
      }
    }
    return iVal === jVal;
  }

  if (!Array.isArray(chekedArr) || !checkedKeys) {
    console.info('Проверка на дублетность объектов в массиве пропущена - нет массива и ключа для сравнения');
    return chekedArr;
  }
  if (typeof options === 'function') {
    doubletAction = options;
    options = {};
  }
  options = options ? options : {};
  options.onlyCheckKeys = options.onlyCheckKeys ? options.onlyCheckKeys : true;
  options.ignoreKeys = options.ignoreKeys ? options.ignoreKeys : [];
  options.packArray = options.packArray ? options.packArray : false;

  let qntDubletDecision = 0;
  for (let i = 0; i < chekedArr.length - 1; i++) { // Формируем массив решений по заявлениям
    for (let j = i + 1; j < chekedArr.length; j++) {
      if (isObjectEqual(chekedArr[i], chekedArr[j])) { // Решения для одинаковых заявлений
        if (options.onlyCheckKeys) {
          if (doubletAction) {
            doubletAction(i, j);
          }
          qntDubletDecision++;
        } else {
          const resCompare = compareObjects(chekedArr[i], chekedArr[j], options.ignoreKeys);
          if (resCompare) {
            if (doubletAction) {
              doubletAction(i, j);
            }
            qntDubletDecision++;
          }
        }
      }
    }
  }

  if (options.packArray) {
    const tmpLength = chekedArr.length;
    chekedArr = chekedArr.filter((item) => { // Для пустых (удаленных) элементов не вызывается
      return item;
    });
    console.info('Удалили %s дублирующих элементов, у которых равны ключи %s. ' +
      'Кол-во элементов массива: до %s, после %s', qntDubletDecision, checkedKeys, tmpLength, chekedArr.length);
  }
  return chekedArr;
}

/**
 * Удаление дублетов строк в массиве
 * @param {Array} arrStrings - массив строк
 * @returns {Array} - массив строк, очищенных от дублетов
 */
function uniqueStringArray(arrStrings) {
  if (!Array.isArray(arrStrings)) {
    return arrStrings;
  }
  const namedArr = {};
  for (let i = 0; i < arrStrings.length; i++) {
    namedArr[arrStrings[i]] = true; // Запомнить строку в виде свойства объекта
  }
  return Object.keys(namedArr);
}

/**
 * Функция постобработки семей и детей, на предмет удаления дублетов в связах m:n
 * https://ion-dv.atlassian.net/browse/KHVCHILDZM-118
 *
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения - массив данных импорта
 * @returns {Object} importedData
 */
function removeDubletChildAndFamily(importedData) {
  if (!Array.isArray(importedData.result[CN_FAMILY]) || !Array.isArray(importedData.result[CN_PERSON])) {
    return importedData;
  }
  let qntDelFam = 0;
  let qntDelChild = 0;
  importedData.result[CN_FAMILY].forEach((family) => {
    if (family.childs) {
      const tmpLen = family.childs.length;
      family.childs = uniqueStringArray(family.childs);
      qntDelFam += tmpLen - family.childs.length;
    }
  });

  /* for (let i = 0; i < importedData.result[CN_FAMILY].length; i++) { // Чистим одинаковые записи детей в семье
    if (importedData.result[CN_FAMILY][i].childs) {
      const tmpLen = importedData.result[CN_FAMILY][i].childs.length;
      importedData.result[CN_FAMILY][i].childs = uniqueStringArray(importedData.result[CN_FAMILY][i].childs);
      qntDelFam += tmpLen - importedData.result[CN_FAMILY][i].childs.length;
    }
  }*/
  importedData.result[CN_PERSON].forEach((person) => {
    if (person.famChilds) {
      const tmpLen = person.famChilds.length;
      person.famChilds = uniqueStringArray(person.famChilds);
      qntDelChild += tmpLen - person.famChilds.length;
    }
  });

  /* for (let i = 0; i < importedData.result[CN_PERSON].length; i++) { // Чистим одинаковые записи семей где он ребенок у персоны
    if (importedData.result[CN_PERSON][i].famChilds) {
      const tmpLen = importedData.result[CN_PERSON][i].famChilds.length;
      importedData.result[CN_PERSON][i].famChilds = uniqueStringArray(importedData.result[CN_PERSON][i].famChilds);
      qntDelChild += tmpLen - importedData.result[CN_PERSON][i].famChilds.length;
    }
  }*/

  console.info('Удалили %s дублирующих связей с семьями у детей и %s связей семей с детьми',
    qntDelFam, qntDelChild);

  return importedData;
}

/**
 * Функция пост обработки, до итогового сохранения объектов импорта
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения -
 * массив данных импорта
 * @param {Object} importedData.verify  - именованный массивом объектов - для проверки
 * @param {Object} importedData.nameSex  - массив объектов с персонами без опеределенного пола
 * @param {Array} importedData.problemPerson  - Массив строк с ФИО персон и проблемами по ним
 * @returns {Promise} - промиз с importedData или ошибкой
 */
function postImportProcessing(importedData) {
  return new Promise(((resolve, reject) => {
    try {
      importedData = removeDubletDeclaration(importedData);
      // Автоикрементируем все заявления
      importedData.result[CN_DECLAR] = autoicrenentDeclar(importedData.result[CN_DECLAR]);

      importedData = removeDubletDecision(importedData);
      importedData = removeDubletChildAndFamily(importedData); // Удаляем задвоение связей детей в семьях и связей семей в детях

      // TODO чистим дублирующие семьи?


      const CHECK_MISSPELL = process.env.IMPORT ? process.env.IMPORT.indexOf('CHECK_MISSPELL') !== -1 : false;
      console.info('(!) ЗНАЧЕНИЕ ПАРАМЕТРА CHECK_MISSPELL ДЛЯ ПРОВЕРКИ ОПЕЧАТОК В ПЕРСОНАХ', CHECK_MISSPELL, process.env.IMPORT);
      if (CHECK_MISSPELL) {
        checkPersonMisspell(importedData.result[CN_PERSON]);
      }

      Object.keys(importedData.verify).forEach((item) => { // Выводим списко объектов на верификации
        if (importedData.result[item] && [`${CN_FAMILY}#declarerID`].indexOf(item) === -1) { // Пропускаем выдачу объектов верификации для специфичный бд
          console.log('###Верификация %s', item, typeof importedData.verify[item],
            Object.keys(importedData.verify[item]).length, importedData.result[item].length);
        }
      });
      // Информация об опрделении пола
      const sexres = require('convert-import').checkSex(importedData.nameSex);
      console.log('Женщины для добавления', util.inspect(Object.keys(sexres.woman)));
      console.log('Мужчины для добавления', util.inspect(Object.keys(sexres.man)));
      // 4debug console.log('Пол не определен', sexres.notCheked);
      for (let i = 0; i < sexres.notCheked.length; i++) {
        importedData.problemPerson.push(`${sexres.notCheked[i].fio} [${
          sexres.notCheked[i].nkar} ${sexres.notCheked[i].bd}]: пол не определен`);
      }

      // Персоны без ДР
      importedData.problemPerson = importedData.problemPerson ? importedData.problemPerson.sort() : [];

      console.log('Персоны с проблемами', importedData.problemPerson.join('\n'));
      console.log('Записи исключения по nkar', importedData.nkarExclusion);
      // 2del проверка исключения У семьи
      // id: 16806bac-8ed9-448d-b2a5-7b93d3e65de4 мать ОСТРОВСКАЯ АННА ИВАНОВНА 1956-12-20 [61bf80f6-80b3-4daf-ac07-6f891b7cd0df] дети ОСТРОВСКАЯ ЕКАТЕРИНА ОЛЕГОВНА 1982-06-25 [a744db7c-d549-414f-88a5-a2862ad38775] БАШКИРЦЕВА НАДЕЖДА ВИТАЛЬЕВНА 1980-02-14 [8977f9a4-b869-4b67-af82-02edbf346135] ОСТРОВСКИЙ РОМАН ОЛЕГОВИЧ 1985-01-20 [cb9d42a0-fe5d-43e0-a1d3-a9d21c6c66bc] NKAR: 05-000000000930 БД: i:\earth\dbf\all\01\earth#05-000000000930
      // для NKAR в earth 05-000000000930 уже задана другая мать, заменяем на Слободенюк Ольга Викторовна 1983-04-29 [7577bf5b-9eae-41a9-9d39-0d1a8470c89c] (родство undefined). ВОЗМОЖНО НУЖНО ДОБАВИТЬ В ИСКЛЮЧЕНИЯ NKAR из БД i:\earth\dbf\NEW\г. Хабаровск\earth.dbf


      importedData = checkConsistency(importedData);
    } catch (err) {
      console.error('Ошибка конвертации импортируемых данных ', err);
      return reject(err);
    }
    return resolve(importedData);
  }));
}

module.exports.postImportProcessing = postImportProcessing;

function checkFamLink(checkLink, importedData) {
  const familyInCheck = importedData.result[CN_FAMILY].some((family) => {
    return family.id === checkLink.fam;
  });
  if (!familyInCheck) {
    console.warn('Не найдена семья с id %s в проверяемом объекте с id %s', checkLink.fam, checkLink.id);
    return false;
  }
  return true;
}

function checkErrInFamilyKey(importedData) {
  let qntDublets = 0;
  let qntErrParren = 0;
  const fathers = {};
  const mothers = {};
  importedData.result[CN_FAMILY].forEach((family, famIndex) => {
    let dubletsFound = false;
    if (typeof family.father !== 'undefined') {
      if (typeof fathers[family.father] === 'undefined') {
        fathers[family.father] = famIndex;
      } else {
        dubletsFound = true;
        console.warn('>>Дублет отцов %s в семьях. Первичная семья \n%s проверяемая семья \n%s', showPersonNameId(family.father, importedData),
          showFamilyIndex(fathers[family.father], importedData),
          showFamilyIndex(famIndex, importedData));
      }
      if (importedData.result[CN_PERSON][importedData.verify[`${CN_PERSON}#id`][family.father]].id !== family.father) {
        qntErrParren++;
      }
    }
    if (typeof family.mother !== 'undefined') {
      if (typeof mothers[family.mother] === 'undefined') {
        mothers[family.mother] = famIndex;
      } else {
        dubletsFound = true;
        console.warn('>>Дублет матери %s в семьях. Первичная семья \n%s проверяемая семья \n%s', showPersonNameId(family.mother, importedData),
          showFamilyIndex(mothers[family.mother], importedData),
          showFamilyIndex(famIndex, importedData));
      }
      if (importedData.result[CN_PERSON][importedData.verify[`${CN_PERSON}#id`][family.mother]].id !== family.mother) {
        qntErrParren++;
      }
    }
    qntDublets = dubletsFound ? ++qntDublets : qntDublets;
  });
  if (qntErrParren) {
    console.warn('Количество ошибок при проверки целостности ссылок на родителей из семьи', qntErrParren);
  } else {
    console.info('Не обнаружено ошибок при проверки целостности ссылок ссылок на родителей из семьи');
  }

  return qntDublets;
}


/**
 * Функция проверки целостности данных
 * @param {Object} importedData - импоритруемые данные
 * @returns {Object} importedData - импоритруемые данные
 */
function checkConsistency(importedData) {
  let deckarFam = 0;
  let removalFam = 0;
  let personFam = 0;

  console.info('Запускаем проверку целостности ссылок на семьи в заявлениях');
  importedData.result[CN_DECLAR].forEach((declar) => {
    if (!checkFamLink(declar, importedData)) {
      deckarFam++;
    }
  });
  if (deckarFam) {
    console.warn('Количество ошибок при проверки целостности ссылок на семьи в заявлениях', deckarFam);
  } else {
    console.info('Не обнаружено ошибок при проверки целостности ссылок на семьи в заявлениях', deckarFam);
  }

  console.info('Запускаем проверку целостности ссылок на семьи в решениях о снятии');
  importedData.result[CN_REMOVAL].forEach((removal) => {
    if (!checkFamLink(removal, importedData)) {
      removalFam++;
    }
  });
  if (removalFam) {
    console.warn('Количество ошибок при проверки целостности ссылок на семьи в решениях о снятии', removalFam);
  } else {
    console.info('Не обнаружено ошибок при проверки целостности ссылок на семьи в решениях о снятии');
  }


  console.info('Запускаем проверку целостности ссылок на семьи в персонах где она ребёнок');
  importedData.result[CN_PERSON].forEach((person) => {
    let famChild = 0;
    const familyInCheck = importedData.result[CN_FAMILY].some((family) => {
      if (!person.famChilds) {
        return true;
      } else if (person.famChilds.indexOf(family.id) !== -1) {
        famChild++;
        return famChild === person.famChilds.length;
      }
      return false;
    });
    if (!familyInCheck) {
      console.warn('Не найдена семья(семьи) &s среди семей где персона %s ребёнок',
        person.famChilds, showPersonNameObj(person));
      personFam++;
    }
  });
  if (personFam) {
    console.warn('Количество ошибок при проверки целостности ссылок на семьи в персонах', personFam);
  } else {
    console.info('Не обнаружено ошибок при проверки целостности ссылок на семьи в персонах');
  }

  console.info('Запускаем проверку уникальности ключевых атрибутов в семье. Дополнительно проверку целостности ссылок на родителей из семьи');
  const qntErrFamKey = checkErrInFamilyKey(importedData);
  if (qntErrFamKey) {
    console.warn('Есть ошибки в уникальности ключевых атрибутов в семье. Неободимо исправить %s записей',
      qntErrFamKey);
  } else {
    console.info('Не обнажурено ошибок в уникальности ключевых атрибутов в семье.',
      qntErrFamKey);
  }

  return importedData;
}



/**
 * Функция поиска первой ошибки в строке - возвращает номер символа
 * @param {String} str1
 * @param {String} str2
 * @returns {Number}
 */
function startDiffInString(str1, str2) {
  if (str1 && str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    const once = true;
    for (let i = 0, j = 0; i < str1.length && j < str2.length; i++, j++) {
      if (once && str1[i] !== str2[j]) {
        return j;
      }
    }
  }
  return -1;
}

/**
 * Функция проверки опечаток в ФИО и ДР персон
 * @param {Array} persons - массив объектов персон
 */
function checkPersonMisspell(persons) {
  const QNT_MISSPEL = 2; // Кол-во ошибок последним аргументом
  const checkMisspelInArray = require('convert-import').checkMisspelInArray;
  const nkarNotMisspel = require('./import-dbf/nkarNotMisspel.json');
  console.log('Проверяем всех персон, на предмет ошибок, с допустимым кол-вом различий (опечаток)', QNT_MISSPEL);
  console.log('Легенда символов подсказок\nЁ - есть разлиие с буквой Ё\n' +
    'Z - есть различие с использованием английских букв\n' +
    '# - ошибка в дате рождения и одна из дат рождения больше даты документа\n' +
    '% в одной из записей (второй) нет документов\n. - номера документов равны\n' +
    '@ - код - если записи проверенны и больше не показывать');
  for (let i = 0; i < persons.length - 1; i++) {
    const dateBornI = persons[i].dateBorn ? persons[i].dateBorn.toISOString().substr(0, 10) : null;
    // Проверяем, что запись не находится уже среди проверенных
    let nkarNotMisspeVerifed = null;
    if (nkarNotMisspel[persons[i].__nkar] &&
        nkarNotMisspel[persons[i].__nkar].FIO.toString() ===
        [persons[i].surname, persons[i].name, persons[i].patronymic].toString()) {
      nkarNotMisspeVerifed = nkarNotMisspel[persons[i].__nkar].verifed;
    }
    for (let j = i + 1; j < persons.length; j++) {
      // Проверяем что запись не находится среди проверенных для nkar записи I
      let isNkarFIOVerifed = false;
      if (nkarNotMisspeVerifed && nkarNotMisspeVerifed[persons[j].__nkar] &&
          nkarNotMisspeVerifed[persons[j].__nkar].toString() ===
          [persons[j].surname, persons[j].name, persons[j].patronymic].toString()) {
        isNkarFIOVerifed = true;
      }
      if (!isNkarFIOVerifed) { // Если нет в уже проверенных различиях персон
        const dateBornJ = persons[j].dateBorn ? persons[j].dateBorn.toISOString().substr(0, 10) : null;
        const qntFindedMisspell = checkMisspelInArray([persons[i].surname, persons[i].name, persons[i].patronymic, dateBornI],
          [persons[j].surname, persons[j].name, persons[j].patronymic, dateBornJ],
          QNT_MISSPEL);
        if (qntFindedMisspell > 0) { // При -1 ошибок больше, при 0 ошибок нет.
          const diffSurname = startDiffInString(persons[i].surname, persons[j].surname);
          const diffSurnameStr = diffSurname !== -1 ? `${persons[j].surname.substr(0, diffSurname)}[${
            persons[j].surname[diffSurname]}]${persons[j].surname.substr(diffSurname + 1)}` : persons[j].surname;
          const diffName = startDiffInString(persons[i].name, persons[j].name);
          const difNameStr = diffName !== -1 ? `${persons[j].name.substr(0, diffName)}[${
            persons[j].name[diffName]}]${persons[j].name.substr(diffName + 1)}` : persons[j].name;
          const diffPatronymic = startDiffInString(persons[i].patronymic, persons[j].patronymic);
          const diffPatronymicStr = diffPatronymic !== -1 ? `${persons[j].patronymic.substr(0, diffPatronymic)}[${
            persons[j].patronymic[diffPatronymic]}]${persons[j].patronymic.substr(diffPatronymic + 1)}` :
            persons[j].patronymic;
          const diffDateBorn = startDiffInString(dateBornI, dateBornJ);
          const diffDateBornStr = diffDateBorn !== -1 ? `${dateBornJ.substr(0, diffDateBorn)}[${
            dateBornJ[diffDateBorn]}]${dateBornJ.substr(diffDateBorn + 1)}` : dateBornJ;
          console.log('\n', persons[i].surname, persons[i].name, persons[i].patronymic, dateBornI, persons[i].__docNum2del,
            persons[i].__docDate2del, persons[i].__nkar, persons[i].__bdName, '\n',
            diffSurnameStr, difNameStr, diffPatronymicStr, diffDateBornStr,
            persons[j].__docNum2del, persons[j].__docDate2del, persons[j].__nkar, persons[j].__bdName);

          // Выводим готовый код для внесения в nkarExlusion.js для записей у которых одинаковые коды документов
          let firstValShowFirst = false;
          let secondValShowFirst = false;
          let typeMisspell = '';

          const iFIO = persons[i].surname + persons[i].name + persons[i].patronymic;
          const jFIO = persons[j].surname + persons[j].name + persons[j].patronymic;
          if (iFIO.search(/[Ёё]/) !== -1 && jFIO.search(/[Ёё]/) === -1) { // Если первая ФИО содержит Ё - меняем (выодвим код) вторую
            secondValShowFirst = true;
            typeMisspell += 'Ё';
          }
          if (iFIO.search(/[A-Za-z]/) === -1 && jFIO.search(/[A-Za-z]/) !== -1) { // Если первая ФИО не содержит англ. символы - меняем (выодвим код) вторую
            secondValShowFirst = true;
            typeMisspell += 'Z';
          }
          if (iFIO.search(/[Ёё]/) === -1 && jFIO.search(/[Ёё]/) !== -1) { // Если вторая ФИО содержит Ё или не содержит англ. символы - меняем (выодвим код) первой
            firstValShowFirst = true;
            typeMisspell += 'Ё';
          }
          if (iFIO.search(/[A-Za-z]/) !== -1 && jFIO.search(/[A-Za-z]/) === -1) {
            firstValShowFirst = true;
            typeMisspell += 'Z';
          }

          if (persons[i].__docNum2del && !persons[j].__docNum2del && // Если в первйо фио есть документ, а во второй нет
                     persons[i].__nkar.substr(0, 2) === persons[j].__nkar.substr(0, 2) && typeMisspell.indexOf('Ё') === -1) { // И заявление создано в одной базе
            secondValShowFirst = true; // То вероятно во второй он был ребенком и документы не завели, а в первой их уточнили и она более достоверна
            typeMisspell += '%'; // Но значение Ё более важно - т.к. откатить с Ё к Е легче, чем обратно.
          } else if (!persons[i].__docNum2del && persons[j].__docNum2del && // Аналогично для второй  есть документ, а для первой нет
            persons[i].__nkar.substr(0, 2) === persons[j].__nkar.substr(0, 2) && typeMisspell.indexOf('Ё') === -1) { // И заявление создано в одной базе
            typeMisspell += '%'; // Но значение Ё более важно - т.к. откатить с Ё к Е легче, чем обратно.
            firstValShowFirst = true; // То вероятно в первой он был ребенком и документы не завели, а во второй их уточнили и она более
          }
          if (persons[i].__docNum2del === persons[j].__docNum2del) {
            typeMisspell = `.${typeMisspell}`;
            if (diffDateBorn && persons[i].__docDate2del && persons[i].__docDate2del === persons[j].__docDate2del) {
              const docDate = `${persons[i].__docDate2del.substr(0, 3)}-${
                persons[i].__docDate2del.substr(4, 5)}-${persons[i].__docDate2del.substr(6)}`;
              if (dateBornJ >= docDate && dateBornI < docDate) {
                firstValShowFirst = true;
                typeMisspell += '#';
              } else if (dateBornI >= docDate && dateBornJ < docDate) {
                secondValShowFirst = true;
                typeMisspell += '#';
              }
            }
          }
          let firstAddToTypeMisspell = '';
          if (!firstValShowFirst && secondValShowFirst) {// Если вторая запись выглядит более достоверной - её выводим раньше. Проверка вручную
            firstAddToTypeMisspell = `!${typeMisspell}`;
            nkarMisspelErrOut([diffSurname, diffName, diffPatronymic, diffDateBorn], persons[j], persons[i], firstAddToTypeMisspell);
            nkarMisspelErrOut([diffSurname, diffName, diffPatronymic, diffDateBorn], persons[i], persons[j], typeMisspell);
          } else {
            if (firstValShowFirst) {
              firstAddToTypeMisspell = `!${typeMisspell}`;
            }
            nkarMisspelErrOut([diffSurname, diffName, diffPatronymic, diffDateBorn], persons[i], persons[j], firstAddToTypeMisspell);
            nkarMisspelErrOut([diffSurname, diffName, diffPatronymic, diffDateBorn], persons[j], persons[i], typeMisspell);
          }
          nkarNotMisspeOut(persons[i], persons[j]);
        }
      }/* 4debug else {
        console.log('Пропущена проверенаая персона', persons[i].__nkar, nkarNotMisspel[persons[i].__nkar].FIO,
          persons[j].__nkar, nkarNotMisspeVerifed[persons[j].__nkar]);
      }*/
    }
  }
}

/**
 * Функция вывода ошибки с опечатками
 * @param {Array} diff - место ошибок
 * @param {Object} personOld - объект с персоной на которую меняем данные
 * @param {Object} personNew - объект с персоной на которую меняем данные
 * @param {String} typeMisspell - тип ошибки
 */
function nkarMisspelErrOut(diff, personOld, personNew, typeMisspell) {
  let replaceStr = '';
  if (diff[0] !== -1) {
    replaceStr = `"FM": "${personNew.surname}"`;
  }
  if (diff[1] !== -1) {
    const replIM = `"IM": "${personNew.name}"`;
    replaceStr = replaceStr ? `${replaceStr}, ${replIM}` : replIM;
  }
  if (diff[2] !== -1) {
    const replOT = `"OT": "${personNew.patronymic}"`;
    replaceStr = replaceStr ? `${replaceStr}, ${replOT}` : replOT;
  }
  if (diff[3] !== -1) {
    const dateBorn = personNew.dateBorn ? personNew.dateBorn.toISOString().substr(0, 10)
      .replace(/-/g, '') : null;
    const replDTR = `"DTR": "${dateBorn}"`;
    replaceStr = replaceStr ? `${replaceStr}, ${replDTR}` : replDTR;
  }
  console.log(`${typeMisspell} "${personOld.__nkar}" : [{"FIO": ["${personOld.surname}", "${personOld.name}", "${personOld.patronymic}"], "replace": {${replaceStr}}}],`);
}

/**
 * Функция вывода код для nkarNotMisspel.json - исключения из выдачи проверенных объектов
 * Пример объекта "03-000000000183": {"FIO": ["ЮДИН", "АЛЕКСАНДР", "СЕРГЕЕВИЧ"],
 * "verided": {"03-000000001897": "FIO": ["ЮДИН", "АЛЕКСАНДР", "СЕРГЕЕВИЧ"]}}
 *
 * @param {Object} personFirst - объект с персоной на которую меняем данные
 * @param {Object} personSecond - объект с персоной на которую меняем данные
 *
 */
function nkarNotMisspeOut(personFirst, personSecond) {
  console.log(`@ "${personFirst.__nkar}": {"FIO": ["${personFirst.surname}", "${personFirst.name}", "${personFirst.patronymic}"], "verifed": {"${personSecond.__nkar}": ["${personSecond.surname}", "${personSecond.name}", "${personSecond.patronymic}"]}},
  "${personSecond.__nkar}": {"FIO": ["${personSecond.surname}", "${personSecond.name}", "${personSecond.patronymic}"], "verifed": {"${personFirst.__nkar}": ["${personFirst.surname}", "${personFirst.name}", "${personFirst.patronymic}"]}},`);
}

/**
 * Автоинкремента заявлений, после сортировки
 */
function autoicrenentDeclar(declarations) {
  if (!declarations) {
    return declarations;
  }
  declarations.sort((decl1, decl2) => {
    if (decl1.regDate < decl2.regDate) {
      return -1;
    }
    if (decl1.regDate > decl2.regDate) {
      return 1;
    }
    return 0;
  });
  for (let i = 0; i < declarations.length; i++) { // Номера заявлений с 1
    declarations[i].regNum = i + 1;
  }
  return declarations;
}

/**
 * Функция обработки после сохранения импорта
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.result  - именованный массивом объектов - имя с названием класса, значения - массив данных импорта
 * @returns {Promise}
 */
function afterSaveProcessing(importedData) {
  return new Promise(((resolve, reject) => {
    if (Object.keys(importedData.result).length !== 0) {
      console.warn('Результаты импорта не были обнулены для классов[%s]: %s. Удаляем',
        Object.keys(importedData.result).length, Object.keys(importedData.result).toString());
      delete importedData.result;
      importedData.result = {};
    }

    return resolve(importedData);
  }));
}

module.exports.afterSaveProcessing = afterSaveProcessing;

/**
 * Функция формирования списка и считывания значений файлов импорта
 * @param {Object} importedData - объект с данными импорта
 * @param {Object} importedData.meta - структура метаданных, наименование объекта - класс с неймспейсом: adminTerritory@khv-svyaz-info
 * @param {Object} importedData.parsed - объект с импортируемыми данными, где имена свойств имена исходных файлов
 * @param {Object} importedData.reference - обюъект с массивами объектов справочников в формате JSON, где имя свойства - имя класса с неймспоейсом: adminTerritory@khv-svyaz-info
 * @param {Array} importedData.result  - массивом объектов с названием класса и данными (массиов) импорта
 * @param {String} importedData.result[].className - имя класса  с неймспейсом: adminTerritory@khv-svyaz-info
 * @param {Array} importedData.result[].data - результирующий массив объектов
 * @returns {Promise}
 */
function getImportedFiles(importedData, importedPath) {
  // importedData.path - укоротичиваем путь - т.к. используем только в базе только папка и район
  importedData.path =  path.basename(path.join(importedData.path, '..'))  + path.sep + path.basename(importedData.path);

  return new Promise(((resolve, reject) => {
    try {
      const importFileLists = [];
      for (let i = 0; i < initFilesList.length; i++) {
        const fn = path.join(importedPath, initFilesList[i]);
        importFileLists.push(fn);
      }

      if (!importedData.parsed) {
        importedData.parsed = {};
      }
      readImportedFiles(importFileLists, (err, parseData) => {
        if (err) {
          reject(err);
        } else {
          for (const key in parseData) {
            if (parseData.hasOwnProperty(key)) {
              importedData.parsed[key] = parseData[key];
            }
          }
          resolve(importedData);
        }
      });
    } catch (e) {
      console.error('Ошибка определения списка папок с метой для конвертации', `${importedPath}:`, e);
      reject(e);
    }
  }));
}

module.exports.getImportedFiles = getImportedFiles;

/**
 * Функция формирования имени класса, для объекта импорта
 * @param {String} fileName - имя файла
 * @returns {*}
 */
function setImportClassName(fileName) {
  return path.basename(fileName, '.dbf');
}

function parseImportFile(fileName, callback) {
  try {
    let enc = 'cp866';
    if (['ray', 'town'].indexOf(path.basename(fileName, '.dbf')) !== -1) {
      enc = 'win1251';
    }
    const parser = new Parserdbf(fileName, {encoding: enc});
    const parsedFile = [];

    /*
     * Когда много файлов - создает шум в логах
     * parser.on('start', function (p) {
     *   console.info('Парсим dBase файл', fileName);
     * });
     */

    // Заголовок
    parser.on('header', (h) => {
      if (fileName.indexOf('earth.dbf') !== -1) { // Корректируем неправильно распознанный тип атрибута OCHER_NUM c числового на флоат
        for (let i = 0; i < h.fields.length; i++) {
          if (h.fields[i].name === 'OCHER_NUM') {
            h.fields[i].type = 'F';
          }
        }
        // 4debug console.log('dBase file header has been parsed', fileName, h.numberOfRecords, h);
      }
    });
    parser.on('record', (record) => {
      if (!record['@deleted']) {
        delete record['@sequenceNumber'];
        delete record['@deleted'];
        parsedFile.push(record);
      }
    });
    parser.on('end', () => {
      /*
       * Когда много файлов - создает шум в логах
       * console.info('Файл %s в формет dBase распарсен', fileName);
       */
      callback(null, fileName, parsedFile);
    });

    parser.parse();
  } catch (e) {
    console.error('Ошибка считывания файла', `${fileName}\n${e}`);
    callback(e);
  }
}

/**
 * Функция фильтрации файлов находящихся только в папках метаданных
 * @param {Object} initFilesList - массивом со списком файлов с полным путем
 * @param {Function} callback - каллбек
 */
function readImportedFiles(initFilesList, callback) {
  const initData = {};

  function readerIterator(initFilesList, i, callback) {
    if (i === initFilesList.length) {
      callback(null);
    } else {
      // 4debug console.log('Импортируем dbf', initFilesList[i]);
      try {
        fs.accessSync(initFilesList[i], fs.constants.F_OK);
        parseImportFile(initFilesList[i], (err, fileName, importedFile) => {
          const className = setImportClassName(fileName);
          initData[className] = importedFile;
          // 4debug console.log('Закончили импорт dbf', initFilesList[i]);
          if (err) {
            callback(err);
          } else {
            readerIterator(initFilesList, ++i, callback);
          }
        });
      } catch (e) {
        console.warn('Отсутствует файл для импорта', initFilesList[i]);
        const className = setImportClassName(initFilesList[i]);
        initData[className] = [];
        readerIterator(initFilesList, ++i, callback);
      }
    }
  }

  readerIterator(initFilesList, 0, () => {
    callback(null, initData);
  });
}

// Получение списка приложений
function getDir(dir) {
  try {
    console.log('dir', dir);
    fs.accessSync(dir, fs.constants.F_OK);
    const files = fs.readdirSync(dir);
    let dirPath = [];
    for (let i = 0; i < files.length; i++) {
      const fn = path.join(dir, files[i]);
      const stat = fs.lstatSync(fn);
      if (stat.isDirectory()) {
        try {
          fs.accessSync(path.join(fn, initFilesList[0]), fs.constants.F_OK);
          const tmpPath = fn.replace(__dirname + path.sep, '');
          dirPath.push(tmpPath);
        } catch (e) {
          const tmp = getDir(fn);
          dirPath = dirPath.concat(tmp);
          console.info('Отсутствует файл конвертации %s, пропущено конвертация и импорт приложения из папки',
            initFilesList[0], fn);
        }
      }
    }
    return dirPath;
  } catch (e) {
    console.warn('Отсутствует дирректория импорта', dir, e);
    return [];
  }
}

