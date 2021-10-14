const obtainEventData = async (contract, eventName) => {
    return {
      startToken: '0x0',
      from: '0x1',
      to: '0x2',
      amount: '1000000000000',
    }
}

const checkEvent = (eventData) => {
    return true;
}

module.exports = {
  obtainEventData,
  checkEvent
}
