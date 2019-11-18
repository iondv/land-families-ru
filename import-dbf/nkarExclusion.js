const fioNKAR = require('./nkarExclusion.json');

const NOT_FOUND = -1;
const FIRST_RECORD = 0;

/**
 * Функция обработки исключений NKAR - формирование уникального NKAR, на основе данных о фамилиях.
 * @param {Object} record  - объект записи из базы данных
 * @param {String} record.NKAR  - номер записи (заявления, по нему же привязываются члены семьи), в целом уникальный. Но в разных база существуют дублеты
 * @param {String} record.FM  - фамилия
 * @param {String} record.IM  - имя
 * @param {String} record.OT  - отчество
 * @param {String} record.RODSTVO - родство
 * @param {String} record.DTR - дата рождения
 * @returns {Object} record
 */
function nkarExclusion(record) {
  record = fixErrorAndMisspell(record); // Исправление ошибок родства, ДР и т.д.

  if (typeof fioNKAR[record.NKAR] !== 'undefined' && // Замена дублетов NKAR по массиву исключений
      fioNKAR[record.NKAR].indexOf(record.FM) !== NOT_FOUND) {
    record.NKAR += fioNKAR[record.NKAR][FIRST_RECORD];
  }
  switch (record.NKAR) { // Исправление дублетов NKAR для разных фамилий родителей с исправлениями других атрибутов или двойных/тройных исправления для одного NKAR
    case '05-000000000654': {
      record.NKAR = record.FM === 'Гельманшин' === NOT_FOUND ? record.NKAR : record.NKAR + 'Гельманшин';
      break;
    }
    case '06-000000000918': {
      record.NKAR = ['Аникина', 'Аникин', 'Храмцов'].indexOf(record.FM) === NOT_FOUND ? record.NKAR: record.NKAR + 'Будяков';
      break;
    }
    case '01-000000000727': {
      record.NKAR = ['Будяков', 'Будякова'].indexOf(record.FM) !== NOT_FOUND ? record.NKAR + 'Будяков' : record.NKAR;
      break;
    }
    case '06-000000000906': {
      record.NKAR = ['Захарова', 'Захаров'].indexOf(record.FM) !== NOT_FOUND ? record.NKAR + 'Захарова' : record.NKAR;
      break;
    }
    case '03-000000002671': {
      record.NKAR = ['ТУРКИН', 'ТУРКИНА'].indexOf(record.FM) !== NOT_FOUND ? record.NKAR + 'ТУРКИН' : record.NKAR;
      break;
    }
    case '10-100000011036': {
      record.NKAR = ['Шваб', 'Андрюшко'].indexOf(record.FM) !== NOT_FOUND ? `${record.NKAR} Шваб` : record.NKAR;
      break;
    }
    default: {
      break;
    }
  }

  switch (record.NKAR) { // Исправление прочих ошибок в рекорд KHVCHILDZM-181
    case '03-000000000447': {
      record.Z_NSP = record.Z_NSP ? record.Z_NSP : '364286';
      break;
    }
    case '02-000000000626': {
      record.Z_NSP = record.Z_NSP ? record.Z_NSP : '364286';
      break;
    }
    default: {
      break;
    }
  }
  return record;

}

module.exports.nkarExclusion = nkarExclusion;

/**
 * Обрвботка выявленных исключений по смене фамлии, на основе nkar
 * @param {Object} person
 * @param {String} person.__nkar
 * @param {String} person.surname
 * @param {String} person.name
 * @param {String} person.patronymic
 * @param {String} person.prevSurname
 * @returns {Object}
 */
function nkarExclusionChangeFamily(person) {
  if (person && person.__nkar) {
    switch (person.__nkar) {
      case '10-100000012349': {
        if (person.surname === 'КОНОВАЛОВА' && person.name === 'ОЛЬГА' && person.patronymic === 'АЛЕКСАНДРОВНА') {
          person.surname = 'КОРШУНОВА';
          const prevSurname = 'КОНОВАЛОВА';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }
      case '10-100000012348': {
        if (person.surname === 'КОРШУНОВА' && person.name === 'ОЛЬГА' && person.patronymic === 'АЛЕКСАНДРОВНА') {
          const prevSurname = 'КОНОВАЛОВА';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }
      case '03-000000000066': {
        if (person.surname === 'КИМ' && person.name === 'ТАТЬЯНА' && person.patronymic === 'ВИССАРИОНОВНА') {
          person.surname = 'СИН';
          const prevSurname = 'КИМ';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }
      case '03-000000002362': {
        if (person.surname === 'СИН' && person.name === 'ТАТЬЯНА' && person.patronymic === 'ВИССАРИОНОВНА') {
          const prevSurname = 'КИМ';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }
      case '04-000000001275': { // Запись ребенком
        if (person.surname === 'КИМ' && person.name === 'СВЕТЛАНА' && person.patronymic === 'ВАЛЕНТИНОВНА') {
          person.surname = 'ПАК';
          const prevSurname = 'КИМ';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }
      case '04-000000001978': { // Запись родителем
        if (person.surname === 'ПАК' && person.name === 'СВЕТЛАНА' && person.patronymic === 'ВАЛЕНТИНОВНА') {
          const prevSurname = 'КИМ';
          person.prevSurname = person.prevSurname || '';
          person.prevSurname = person.prevSurname.indexOf(prevSurname) === NOT_FOUND ?
            person.prevSurname += ';' + prevSurname : prevSurname;
          person.changeSurname = true;
        }
        return person;
      }

      default:
        return person;
    }
  }
  return person;
}

module.exports.nkarExclusionChangeFamily = nkarExclusionChangeFamily;

/**
 * Функия замены значений ключей в массиве, значениями аналогичных ключей в другом объекте
 * @param {Object} record
 * @param {Object} replaceVal
 * @returns {*}
 */
function replaceObjectKeysInArray(record, replaceVal) {
  for (let key in replaceVal) {
    if (replaceVal.hasOwnProperty(key)) {
      record[key] = replaceVal[key];
    }
  }
  return record;
}

/**  Исправление опечаток
 * @param {Object} record  - объект записи из базы данных
 * @param {String} record.NKAR  - номер записи (заявления, по нему же привязываются члены семьи), в целом уникальный. Но в разных база существуют дублеты
 * @param {String} record.FM  - фамилия
 * @param {String} record.IM  - имя
 * @param {String} record.OT  - отчество
 * @param {String} record.RODSTVO - родство
 * @param {String} record.DTR - дата рождения
 * @returns {*}
 */
function fixErrorAndMisspell(record) {
  const NKAR_MISSPEL = require('./nkarMisspell.json');
  record = replaceEngSimbolInFIO(record);
  // Замена по объекту с исключениями
  // Пример {'06-000000000445': [{FIO: ['ИГНАТОВА', 'ЕЛЕНА', 'ВЛАДИМИРОВНA'], 'replace': {'OT': 'ВЛАДИМИРОВНА'}]}
  if (typeof NKAR_MISSPEL[record.NKAR] !== 'undefined') {
    NKAR_MISSPEL[record.NKAR].forEach((itemMisspell) => {
      if (itemMisspell.FIO[0] && itemMisspell.FIO[0] === record.FM) {
        if (itemMisspell.FIO[1] === record.IM) {
          if (itemMisspell.FIO[2] === record.OT) {
            return replaceObjectKeysInArray(record, itemMisspell.replace);
          } else if (!itemMisspell.FIO[2]) { // Если в ФИО только фамилия и имя - исправляем
            return replaceObjectKeysInArray(record, itemMisspell.replace);
          }
        } else if (!itemMisspell.FIO[1]) { // Если в ФИО только фамилия и имя - исправляем
          return replaceObjectKeysInArray(record, itemMisspell.replace);
        }
      }
    });
  }
  return record;
}

const replaceEngEqualRusSymbol = require('convert-import').replaceEngEqualRusSymbol;

let onceShow = false;

/**
 * Замена английский символов в ФИО русскими
 * @param {Object} record
 * @returns {*}
 */
function replaceEngSimbolInFIO(record) {
  if (record.FM.search(/[A-Za-z]/) !== NOT_FOUND ||
    record.IM.search(/[A-Za-z]/) !== NOT_FOUND ||
    record.OT.search(/[A-Za-z]/) !== NOT_FOUND) { // Если ФИО содержит англ. символы
    record.FM = replaceEngEqualRusSymbol(record.FM);
    record.IM = replaceEngEqualRusSymbol(record.IM);
    record.OT = replaceEngEqualRusSymbol(record.OT);
    if (!onceShow) {
      console.info('(!)Заменены английские символы в ФИО:', record.FM, record.IM, record.OT, record.DTR, record.NKAR,
        '\nДАЛЕЕ ЗАМЕНА АНГЛИЙСКИХ СИМВОЛОВ ВЕЗДЕ, СООБЩЕНИЯ НЕ ВЫВОДЯТСЯ');
      onceShow =  true;
    }

  }
  return record;
}
