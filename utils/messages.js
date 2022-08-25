import moment from 'moment';

export const formatMessage = (username, text, image) => {
   return {
      username,
      text,
      time: moment().format('HH:mm'),
      image
   };
}