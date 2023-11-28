let accounts = [];
let page = 1;
let prevData = null;
let bookmarks = ('bookmarks' in localStorage) ? JSON.parse(localStorage.getItem('bookmarks')) : [];

if (bookmarks.length > 0) $('#downmarked, #remove-marked').show();
axios.defaults.baseURL = 'https://son-link.github.io/bestodon';

if (location.hash) page = parseInt(location.hash.replace('#page-', ''));

const paginate = (items, page = 1, perPage = 10) => {
	const offset = perPage * (page - 1);
	const totalPages = Math.ceil(items.length / perPage);
	const paginatedItems = items.slice(offset, perPage * page);

	return {
		previousPage: page - 1 ? page - 1 : null,
		nextPage: (totalPages > page) ? page + 1 : null,
		total: items.length,
		totalPages: totalPages,
		items: paginatedItems
	};
};

const getData = list => {
	axios.get(`/assets/lists/${list}.json`)
	.then( resp => {
		accounts = resp.data;
		drawAccounts();
		drawPagination();
	});
}

const drawAccounts = () => {
	data = paginate(accounts, page, 10);
	const tpl = $('#account-tpl').html();
	const html = ejs.render(tpl, { items: data.items, bookmarks: bookmarks });
	$('#list').html(html)

	const from = (10 * (page -1 )) + 1;
	const to = (from + 9 <= data.total) ? from + 9 : data.total
	$('#total-pages').html(`View ${from} - ${to} of ${accounts.length} accounts`);
}

const drawPagination = () => {
	$('#pagination').empty();
	const totalPages = Math.ceil(accounts.length / 10);

	if (page > 1) {
		$('#pagination').append(`<a class="page md:w-8 h-8 text-white flex items-center justify-center" href="#page-${page-1}">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
	<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
</svg>
			<span class="md:hidden">Prev</span>
		</a>`);
	}

	for (i = 0; i < totalPages; i++) {
		if (page == i+1)
			$('#pagination').append(`<span class="rounded-full bg-gray-100 text-neutral-900 w-8 h-8 items-center justify-center hidden md:flex">${i+1}</span>`);
		else
			$('#pagination').append(`<a class="page rounded-full text-white w-8 h-8 items-center justify-center hidden md:flex" href="#page-${i+1}">${i+1}</a>`);
	}

	if (page < totalPages) {
		$('#pagination').append(`<a class="page text-white md:w-8 h-8 flex items-center justify-center" href="#page-${page+1}">
					<span class="md:hidden">Next</span>
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
	<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
</svg>  
		</a>`);
	}
}

const clearSearch = () => {
	if (prevData) {
		accounts = prevData;
		prevData = null;
	}

	$('#list').show('grid');
	$('.clear-search').hide();
	$('.search-icon').show();
	location.hash = '';
	page = 1;
	window.scrollTo({ top: 0, behavior: 'smooth' });
	drawAccounts();
	drawPagination();
}

const AddDelBookmark = ele => {
	const acct = $(ele).attr('data-acct');
	if ($(ele).hasClass('marked')) {
		bookmarks.push(acct);
	} else {
		bookmarks = bookmarks.filter(function(value, index, arr){ 
			return value != acct;
		});
	}

	$('#downmarked, #remove-marked').hide();
	if (bookmarks.length > 0) {
		$('#downmarked, #remove-marked').show();
	}

	localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

document.addEventListener("DOMContentLoaded", () => {
	$('#pagination').on('click', '.page', function() {
		if (! $(this).attr('href').startsWith('#page-')) return;

		page = parseInt($(this).attr('href').replace('#page-', ''));
		drawPagination();
		drawAccounts();
		window.scrollTo({ top: 0, behavior: 'smooth' })
	});

	$('.search').on('keyup', function() {
		$('#no-results').hide();
		$('#list').show('grid');
		const search = $(this).val().toLowerCase().trim();

		if (prevData) {
			accounts = prevData;
			prevData = null;
			drawAccounts();
			drawPagination();
		}

		if (search.length > 0) {
			$('.clear-search').show();
			$('.search-icon').hide();
		} else {
			$('.clear-search').hide();
			$('.search-icon').show();
		}

		if (search.length < 3) return;

		const results = accounts.filter( (data)=>{
			var regex = new RegExp(search, "i");
			return data.username.match(regex) || data.acct.match(regex)  || data.note.match(regex);
		});

		if (results.length > 0) {
			if (!prevData) prevData = accounts;
			accounts = results;
			drawAccounts();
			drawPagination();
		} else {
			$('#no-results').show();
			$('#list').hide();
			$('#pagination').empty();
		}

		location.hash = '';
		page = 1;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	$(window).on('scroll', () => {
		if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300)
			$('#backtotop').show();
		else $('#backtotop').hide();
	});

	$('#backtotop').on('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

	$('.clear-search').on('click', () => {
		$('.search').each( ele => ele.value = '');
		clearSearch();
	});

	$('body').on('click', '.bookmark', function() {
		$(this).toggleClass('marked');
		AddDelBookmark(this);
	});

	$('#downmarked').on('click', () => {
		let csv = 'Account address,Show boosts,Notify on new posts,Languages\r\n';
		bookmarks.forEach(marked => csv += `${marked},true,false\r\n`);

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
   		const link = document.createElement("a");
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "accts2follow.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
	});

	$('#remove-marked').on('click', () => {
		bookmarks = [];
		localStorage.removeItem('bookmarks');
		$('#downmarked, #remove-marked').hide();
		$('.bookmark').removeClass('marked');
	});
});