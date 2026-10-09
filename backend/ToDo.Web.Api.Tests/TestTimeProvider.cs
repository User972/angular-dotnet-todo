using System;
using System.Collections.Generic;
using System.Text;

namespace ToDo.Web.Api.Tests
{

    internal sealed class TestTimeProvider : TimeProvider
    {
        private DateTimeOffset _utcNow;

        public TestTimeProvider(DateTimeOffset utcNow)
        {
            _utcNow = utcNow;
        }

        public override DateTimeOffset GetUtcNow()
            => _utcNow;

        public void Advance(TimeSpan timeSpan)
            => _utcNow = _utcNow.Add(timeSpan);
    }
}