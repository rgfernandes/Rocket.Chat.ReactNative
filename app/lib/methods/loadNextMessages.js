import EJSON from 'ejson';
import moment from 'moment';
import orderBy from 'lodash/orderBy';

import log from '../../utils/log';
import updateMessages from './updateMessages';
import { getMessageById } from '../database/services/Message';
import { MESSAGE_TYPE_LOAD_NEXT_CHUNK } from '../../constants/messageTypeLoad';

const COUNT = 50;

export default function loadNextMessages(args) {
	return new Promise(async(resolve, reject) => {
		try {
			const data = await this.methodCallWrapper('loadNextMessages', args.rid, args.ts, COUNT);
			let messages = EJSON.fromJSONValue(data?.messages);
			messages = orderBy(messages, 'ts');
			if (messages?.length) {
				const lastMessage = messages[messages.length - 1];
				const lastMessageRecord = await getMessageById(lastMessage._id);
				if (!lastMessageRecord) {
					const dummy = {
						_id: `dummy-${ lastMessage._id }`,
						rid: lastMessage.rid,
						tmid: args.tmid,
						ts: moment(lastMessage.ts).add(1, 'millisecond'), // TODO: can we do it without adding 1ms?
						t: MESSAGE_TYPE_LOAD_NEXT_CHUNK
					};
					if (messages.length === COUNT) {
						messages.push(dummy);
					}
				}
				await updateMessages({ rid: args.rid, update: messages, loaderItem: args.loaderItem });
				return resolve(messages);
			} else {
				return resolve([]);
			}
		} catch (e) {
			log(e);
			reject(e);
		}
	});
}