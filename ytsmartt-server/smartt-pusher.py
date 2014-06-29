import pusher

p = pusher.Pusher(app_id='79608', key='415c1dd7ebe39d37a685', secret='c25af49d1eca4d9dd7c1')
p['ytsmartt'].trigger('new-comment',{'message': 'hello world'})
