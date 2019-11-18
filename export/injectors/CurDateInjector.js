/**
 * Created by Vasiliy Ermilov (ermilov.work@yandex.ru) on 2/27/17.
 */
const moment = require('moment');

function CurDateInjector() {
  /**
   *
   * @param {{}} value
   */
  this.inject = function (value) {
    if (value) {
      value._now = moment().format('"DD"      MM       YYYY');
    }
    return value;
  };
}

module.exports = CurDateInjector;
