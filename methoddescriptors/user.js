module.exports = {
  create: [{
    title: 'Data hash',
    type: 'object'
  }],
  read: [{
    title: 'Query descriptor',
    type: 'object',
    required: false
  }],
  update: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  },{
    title: 'Operation descriptor',
    type: 'object'
  },{
    title: 'Options object',
    type: 'object'
  }],
  delete: [{
    title: 'Filter descriptor',
    type: 'object',
    required: false
  }],
  aggregate : [
    {
      title : 'Aggregate descriptor',
      type : ['array', 'string']
    }
  ]
};
