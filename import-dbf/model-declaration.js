/**
 * Конвертация заявления и решений по участкам
 */

const generateGUID = require('convert-import').generateGUID;
const convertDate = require('./model-document').convertDate;

const classNames = require('./class-names.json');
const CN_DECLAR = classNames.declar;
const CN_LOCATION_LAND = classNames.locationLand;
const CN_DECISION = classNames.acceptedDecision;

const path = require('path');

/**
 * Парсинг декларации
 */
function declarationParse(record, importedData) {
  record['Z_TIME'] = correctDeclarTime(record['Z_TIME']);

  let regDateTime = record['Z_DATA'] ?
    new Date (record['Z_DATA'].substr(0, 4) + '-' + record['Z_DATA'].substr(4, 2) +
    '-' + record['Z_DATA'].substr(6, 2) + ' ' + record['Z_TIME']) :
    null;
  if (regDateTime) {
    try {
      if (regDateTime.toISOString() === 'Invalid Date') {
        console.warn('Неправильный формат даты заявления ', record['Z_DATA']);
      }
      // Ошибка коррекции часовых поясов. Не нужна, можно удалять
      // else {
      //  regDateTime.setDate(regDateTime.getHours() - 10); // Добавляем часовые пояса
      // }
    } catch (e) {
      console.warn('Ошибка даты заявления, устанавливаем только дату', e.message, record['Z_DATA'], record['Z_TIME']);
      regDateTime = new Date(record['Z_DATA'].substr(0, 4) + '-' + record['Z_DATA'].substr(4, 2) + '-' +
        record['Z_DATA'].substr(6, 2));
    }
  } else {
    console.warn('Не уазана обязательная дата завления. Поставлена в 1900-01-01 ', record['Z_DATA']);
    regDateTime = new Date('1900-01-01');
  }
  let targetZu = getTarget(record['CAZUS']);
  let isFromArchive = importedData.path.indexOf('Архив') !== -1;
  let declaration = {regNumOld: isFromArchive ? 'arсh_' + record['Z_NUM'] : record['Z_NUM'], // В папке Архив добавляем префикс, чтобы заявления как дублеты не объединялись - т.к. они заявления на имзенение
    regDate: regDateTime, registrationDate: regDateTime,
    typePet: isFromArchive ? 'changeInfo' : 'statement', // По умолчанию значенип "Постановка на учет", Но в папке Архив - все заявления на изменение
    surety: false, socNaim: false, mfc: false, kgku: false, info: false,
    status: 'Новое',
    target: targetZu,
    pRZOVHKVTCVAR: true, nFNMPZEDDISDS: true, oVNSPUOPUPMIV: true,
    __nkar: record['NKAR'], __bdName: 'earth#' + record['NKAR'],
    id: generateGUID(), _class: CN_DECLAR, _classVer: ''};
  if (record['PLMIN']) {
    declaration.startArea = record['PLMIN'];
  }
  if (record['PLMAX']) {
    declaration.endArea = record['PLMAX'];
  }
  if (record['Z_RAY'] || record['Z_NSP']) {
    let locationLand = getLocationLand(record);
    if (locationLand) {
      importedData.result[CN_LOCATION_LAND].push(locationLand);
      declaration.placeArea = locationLand.id;
    }
  }
  if (record['OCHER_NUM']) { // Проставляем номер очереди. Т.к. наличие номера очереди является значением учетка заявления как очередника - то проставляем queue
    declaration.orderNum = record['OCHER_NUM'];
    declaration.queue = true;
  } else {
    declaration.queue = false;
  }
  declaration.placePet = setPlacePet(importedData.path);
  const fullZNum = record['RAY'] + '#' + record['Z_NUM'] + '#' + record['Z_NSP'] + record['R_NUM'] + '#' +
    declaration.__bdName; // Полный код номер заявления с учетом района подачи и кода желаемого нас.пункта, также базе
  /* Не нужно на самом деле - нигде не используется. Дублет номера заявления - не основание его пропуска
  if (!record['Z_NUM']) {
    console.warn('Уникальный и обязательный номер заявления, отсутствует. Значение "%s"', record['Z_NUM']);
  } else if (typeof importedData.verify[CN_DECLAR][fullZNum] !== 'undefined') {
    console.warn('Дублирование номера заявления %s в данной базе %s для NKAR %s! есть для id %s и для текущего с id %s',
      fullZNum, declaration.__bdName, declaration.__nkar, importedData.verify[CN_DECLAR][fullZNum], declaration.id);
  } else {
    importedData.verify[CN_DECLAR][fullZNum] = declaration.id;
  }*/

  decisionParse(declaration, record, importedData);

  return declaration;
}

/**
 * Функция регистрации решения
 * @param {Object} declaration
 * @param {Object} record
 * @param {Object} importedData
 */
function decisionParse(declaration, record, importedData) {
  let decision = {pet: declaration.id,
    id: generateGUID(), _class: CN_DECISION, _classVer: ''};
  if (record['U_NUM']) {
    decision.numNotice = record['U_NUM'];
    decision.dateNotice = convertDate(record['U_DATA']);
  }
  if (record['R_NUM']) {
    decision.num = record['R_NUM'];
    decision.date = convertDate(record['R_DATA']);
    decision.type = 'statement';
  } else if (record['O_NUM'] || (record['O_PRK'] && record['O_PRK'] !== '000')) {
    decision.num = record['O_NUM'] || '';
    decision.date = convertDate(record['O_DATA']);
    decision.type = 'refuse';
    decision.base = getRefuseValue(record['O_PRK']);
    if (!decision.base && record['O_PRK'] !== '000') {
      console.warn('Отсутствует соответствие коду отказа %s %s для NKAR %s ', record['O_PRK'], record['O_PRKC'],
        record['NKAR']);
    }
  } else {
    // Не нужный варинг, т.к. такие ситуации частые - когда был поставлен из одного района сраза у в другой
    // console.warn('Для заявления с NKAR %s нет ни решения "%s", ни отказа "%s"', record['NKAR'], record['R_NUM'],
    //   record['O_NUM']);
    decision = null;
  }
  if (decision) {
    importedData.result[CN_DECISION].push(decision);
  }

  return decision;
}

/**
 * Функция сопоставления целей получения участков
 * @param {String} prk - код отказа из базы vocotkaz.DBF
 * @returns {String | null}
 */
function  getRefuseValue(prk) {
  switch (prk) {
    case '001': // Представление неполного пакета документов
      return 'incompleteDoc'; // Представление неполного пакета документов
    case '002': // Подача заявления лицом, не уполномоченным на данное действие
      return 'personNotAuthorised'; // Подача заявления лицом, не уполномоченным на осуществление таких действий
    case '004': // Отсутствие права на предоставление земельного участка
      return 'lackRight'; // Отсутствие права на приобретение земельного участка
    case '005': // Отсутствие в заявлении подписи дееспособного члена семьи
      return 'capablePerson'; // Отсутствие в заявлении кого-либо из дееспособных членов семьи и их письменного согласия на подписание заявления одним дееспособным членом данной семьи
    case '003': // Реализация права приобретения бесплатно земельного участка
      return 'rightFreePurchase'; // Реализация права приобретения бесплатно земельного участка (не примен.)
    case '006': // Отсутствие права на жилой дом
      return 'noRightHouse'; // Отсутствие права на жилой дом (не примен.)
    default:
      return null;
  }
}

/**
 * Функция сопоставления целей получения участков
 * @param {String} pathName - путь импорта, содержит в себе код района. Районы сопоставляются жестко из готового српавочника declarationPlace
 * @returns {String | null}
 */
function  setPlacePet(pathName) {
  let bdName = pathName; // Пример dbf\\08
  switch (bdName) {
    case 'NEW\\Амурский район':
    case 'all\\09':
    case 'Архив\\9':
      return '25d4e3f0-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Аяно-Майский район':
    case 'all\\27':
      return '6cfef810-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Бикинский район':
    case 'all\\08':
    case 'Архив\\8':
      return 'c13d1700-0ac9-11e7-bf4a-336097b15e2';

    case 'NEW\\Ванинский район':
    case 'all\\29':
      return '993ca710-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Верхнебуреинский район':
    case 'all\\15':
    case 'Архив\\15':
      return '78cf90f0-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Вяземский район':
    case 'all\\07':
    case 'Архив\\7':
      return '4d67cf90-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\г. Комсомольск':
    case 'all\\11':
    case 'Архив\\11':
      return 'dd24f320-0ac9-11e7-bf4a-336097b15e26';

    case 'NEW\\г. Хабаровск':
    case 'all\\01':
    case 'Архив\\1':
    case 'all\\02':
    case 'Архив\\2':
    case 'all\\03':
    case 'Архив\\3':
    case 'all\\04':
    case 'Архив\\4':
    case 'all\\05':
    case 'Архив\\5':
      return '9c30d640-0ac9-11e7-bf4a-336097b15e26';

    case 'NEW\\Комсомольский район':
    case 'all\\12':
    case 'Архив\\12':
      return '90509080-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Лазо':
    case 'all\\10':
    case 'Архив\\10':
      return '357d38c0-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Нанайский район':
    case 'all\\13':
    case 'Архив\\13':
      return '42e90b10-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Николаевский район':
    case 'all\\23':
      return 'eab34190-0ac9-11e7-bf4a-336097b15e26';

    case 'NEW\\Охотский район':
    case 'all\\26':
      return '057e8a20-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\район им. Полины Осипенко':
    case 'all\\25':
      return '58819b90-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Советско-Гаванский район':
    case 'all\\16':
    case 'Архив\\16':
      return 'd19a3ce0-0ac9-11e7-bf4a-336097b15e26';

    case 'NEW\\Солнечный район':
    case 'all\\30':
      return '85872e70-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Тугуро-Чумиканский район':
    case 'all\\24':
      return '630a9940-0aca-11e7-bf4a-336097b15e26';

    case 'NEW\\Ульчский район':
    case 'all\\14':
    case 'Архив\\14':
      return 'f60f46b0-0ac9-11e7-bf4a-336097b15e26';

    case 'NEW\\Хабаровский район':
    case 'all\\06':
    case 'Архив\\6':
      return 'a6c74170-0ac9-11e7-bf4a-336097b15e26';

    default:
      return null;
  }
}

/**
 * Формирование адреса желаемого участка
 * @param {Object} record
 * @returns {Object}
 */
function getLocationLand(record) {
  let locationLand = {
    id: generateGUID(), _class: CN_LOCATION_LAND, _classVer: ''};
  if (record['Z_RAY']) {
    locationLand.district = record['Z_RAY'];
  }
  if (record['Z_NSP']) {
    if (['3642861', '3642862', '3642863', '3642864', '388805'].indexOf(record['Z_NSP']) !== -1) { // Для города Хабаровск (Южный) и подобных - ставим Хабаровск
      locationLand.town = '364286';
    } else {
      locationLand.town = record['Z_NSP'];
    }
  }
  return locationLand;
}
/**
 * Функция сопоставления целей получения участков
 * @param {String} cazus - код цели предосатвления участка из базы cazus.DBF
 * @returns {String | null}
 */
function getTarget(cazus) {
  switch (cazus) {
    case '001': // Для осуществления индивидуального жилищного строительства .
      return 'individConstr'; // Индивидуальное жилищное строительство
    case '002': // Для осуществления дачного строительства .
      return 'countryConstr'; // Осуществление дачного строительства
    case '003': // Для ведения садоводства и огородничества .
      return 'gardeningHorticult'; // Для ведения садоводства и огородничества
      // return 'gardeningFarms'; // Ведение садоводства, огородничества, дачного хозяйства
    case '004': // Для ведения личного подсобного хозяйства .
      return 'personalPartFarm'; // Ведение личного подсобного хозяйства
    case '005': // Для осуществления животноводства
      return 'implemLivestock'; // Осуществление животноводства
    case '006': // Для ведения крестьянского (фермерского) хозяйства .
      return 'peasantEconomy'; // Ведение крестьянского (фермерского) хозяйства
    case '008': // Для исп-я под существующим инд. жилым домом, наход. в собств -> 008
      return 'useExistHouse'; // Использование под существующим жилым домом
    default:
      console.warn('Отсутствует значение справочника для целей предосатвления участка в заявлении (cazus.dbf)для кода',
        cazus);
  }
  return null;
}

module.exports.declarationParse = declarationParse;

/**
 * Функция коррекции ошибочных значений времени в базе по словарю
 * @param {String} recordZTime
 * @returns {String}
 */
function correctDeclarTime(recordZTime) {
  switch (recordZTime) { // Исправляем одиночную ошибку во времени
    case '09:2049:':
      return '09:20:49';
    case '14.00':
      return '14:00:00';
    case '16:5038:':
      return '16:50:38';
    case '10:4538:':
      return '10:45:38';
    case '1455:4':
      return '14:55:4';
    case '1423:26':
      return '14:23:26';
    case '12:4031:':
      return '12:40:31';
    case '16:5026:':
      return '16:50:26';
    case '10 09:':
      return '10:09:00';
    case '1128:00':
      return '11:28:00';
    case '1434':
      return '14:34:00';
    case '54:00:00':
      return '14:00:00';
    default:
      return recordZTime.replace(/\./g, ':');
  }
}
